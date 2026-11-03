-- ELUS v1.89 — triagem lexical de referencias a alvos de DROP, SOMENTE LEITURA.
-- Executar apenas em sessao READ ONLY autorizada. Nao executar DROP nem migration.
-- Examina prosrc de funcoes/procedures fora dos schemas de sistema.
-- Nao examina codigo TS, SQL dinamico montado em runtime, corpos SQL-standard
-- armazenados fora de prosrc, nem prova ausencia de dependencias funcionais.
-- Nao retorna corpos SQL, dados de clientes ou segredos.
WITH targets(target_name) AS (VALUES
  ('fn_definir_aviso_de_caso'),
  ('external_db_connections_safe'),
  ('fn_automation_rodizio_atribuir'),
  ('fn_attendant_metrics')
), candidates AS (
  SELECT t.target_name,
    p.oid::regprocedure::text AS function_signature,
    CASE WHEN p.prosrc ~*
      ('(^|[^a-z0-9_])' || t.target_name || '([^a-z0-9_]|$)')
      THEN true ELSE false END AS source_match
  FROM targets t
  CROSS JOIN pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
    AND p.prokind IN ('f', 'p')
)
SELECT target_name,
  count(*) FILTER (WHERE source_match) AS source_references,
  COALESCE(
    array_agg(function_signature ORDER BY function_signature)
      FILTER (WHERE source_match),
    ARRAY[]::text[]
  ) AS matching_functions
FROM candidates
GROUP BY target_name
ORDER BY target_name;
