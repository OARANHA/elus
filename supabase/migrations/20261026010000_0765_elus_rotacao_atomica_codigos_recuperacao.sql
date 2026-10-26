-- manifest: Rotaciona exatamente dez hashes de recuperação MFA numa única transação e serializa requisições concorrentes por usuário; execução exclusiva de service_role, depois de getUser, TOTP verificado e AAL2 no servidor. Esta migration é ADICIONAL ao lote histórico v1.89; NÃO executar no banco real antes do ensaio e da reconciliação do ledger.
--
-- A função toda é uma transação PostgREST: uma falha de DELETE/INSERT reverte
-- a operação inteira, preservando os códigos anteriores. Advisory lock é
-- transacional e compartilhado entre instâncias de app, não um mutex local.
-- Não altera 0755, 0759, as 38 migrations upstream nem as 4 ELUS existentes.
CREATE OR REPLACE FUNCTION public.fn_elus_rotacionar_codigos_recuperacao(
  p_user_id uuid,
  p_hashes_hex text[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inseridos integer;
BEGIN
  -- Validação também no banco: nunca aceitar rotação parcial, hashes
  -- inválidos, duplicados ou usuário ausente. Nenhum código plaintext.
  IF p_user_id IS NULL OR p_hashes_hex IS NULL
     OR pg_catalog.cardinality(p_hashes_hex) <> 10 THEN
    RAISE EXCEPTION 'invalid recovery rotation input' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.unnest(p_hashes_hex) AS c(hex_hash)
    WHERE c.hex_hash IS NULL OR c.hex_hash !~ '^[0-9a-f]{64}$'
  ) OR (
    SELECT count(DISTINCT c.hex_hash)
    FROM pg_catalog.unnest(p_hashes_hex) AS c(hex_hash)
  ) <> 10 THEN
    RAISE EXCEPTION 'invalid recovery hashes' USING ERRCODE = '22023';
  END IF;

  -- Serializa chamadas da mesma conta inclusive entre diferentes workers.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('elus:recovery:' || p_user_id::text, 0)
  );

  DELETE FROM public.user_recovery_codes WHERE user_id = p_user_id;
  INSERT INTO public.user_recovery_codes (user_id, code_hash)
  SELECT p_user_id, pg_catalog.decode(c.hex_hash, 'hex')
  FROM pg_catalog.unnest(p_hashes_hex) AS c(hex_hash);
  GET DIAGNOSTICS v_inseridos = ROW_COUNT;
  IF v_inseridos <> 10 THEN
    RAISE EXCEPTION 'incomplete recovery rotation' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_inseridos;
END;
$$;

-- Funções public do Supabase são executáveis por PUBLIC por default.
-- Revoke explícito de permissões herdadas/diretas; nenhuma autenticação do
-- navegador pode chamar a função. Só o cliente de serviço, já autorizado pela
-- sessão validada da Server Action, recebe EXECUTE.
REVOKE ALL ON FUNCTION public.fn_elus_rotacionar_codigos_recuperacao(uuid, text[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_elus_rotacionar_codigos_recuperacao(uuid, text[])
  TO service_role;
