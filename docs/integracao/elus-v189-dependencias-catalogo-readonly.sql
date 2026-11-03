-- ELUS v1.89 — inventario de dependencias de catalogo, SOMENTE LEITURA.
-- Inspecionar em sessao/transaction READ ONLY no clone autorizado PG15/PG17.
-- Nao executa migrations, nao consulta tabelas de clientes e nao aprova DROP.
-- pg_depend aponta dependencias registradas no catalogo, nao chamadas dinamicas
-- em codigo TS/PLpgSQL nem prova de compatibilidade funcional.
-- Um alvo ABSENT nao significa que o replay pode prosseguir.
-- KIND_MISMATCH sinaliza nome existente com tipo incompatível com DROP VIEW/FUNCTION;
-- não interpretar PRESENT nem ausência de dependências como aprovação de DROP.
-- Nao comparar d.objid com o OID do alvo: sao OIDs de catalogos distintos;
-- coincidencia numerica pode ocultar uma dependencia valida.
-- Regras e tipos compostos proprios de views sao dependencias internas;\n-- deptype, catalogo e vinculo ao OID da view exigem triagem.
-- Ref: migrations 0687, 0763/0706, 0764 e 0754.

WITH targets AS (
  SELECT *
  FROM (VALUES
    (
      '0687',
      'function',
      'public.fn_definir_aviso_de_caso(uuid,uuid,text,text,boolean,boolean)',
      to_regprocedure('public.fn_definir_aviso_de_caso(uuid,uuid,text,text,boolean,boolean)')::oid,
      'pg_catalog.pg_proc'::regclass::oid
    ),
    (
      '0763/0706',
      'view',
      'public.external_db_connections_safe',
      to_regclass('public.external_db_connections_safe')::oid,
      'pg_catalog.pg_class'::regclass::oid
    ),
    (
      '0764',
      'function',
      'public.fn_automation_rodizio_atribuir(uuid,uuid,uuid)',
      to_regprocedure('public.fn_automation_rodizio_atribuir(uuid,uuid,uuid)')::oid,
      'pg_catalog.pg_proc'::regclass::oid
    ),
    (
      '0754',
      'function',
      'public.fn_attendant_metrics(uuid,timestamptz,timestamptz,uuid)',
      to_regprocedure('public.fn_attendant_metrics(uuid,timestamptz,timestamptz,uuid)')::oid,
      'pg_catalog.pg_proc'::regclass::oid
    )
  ) AS t(migration, kind, object_name, object_oid, catalog_oid)
)
SELECT
  t.migration,
  t.kind,
  t.object_name,
  CASE
    WHEN t.object_oid IS NULL THEN 'ABSENT'
    WHEN t.kind = 'view' AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_class c
      WHERE c.oid = t.object_oid AND c.relkind = 'v'
    ) THEN 'KIND_MISMATCH'
    WHEN t.kind = 'function' AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid = t.object_oid AND p.prokind = 'f'
    ) THEN 'KIND_MISMATCH'
    ELSE 'PRESENT'
  END AS target_state,
  d.deptype AS dependency_type,
  d.classid::regclass::text AS dependent_catalog,
  d.objid AS dependent_oid,
  d.objsubid AS dependent_subid,
  d.refobjsubid AS target_column_subid,
  -- Regra _RETURN interna da propria view nao e dependencia externa.
  -- Outras dependencias continuam visiveis e exigem revisao manual.
  CASE
    WHEN d.objid IS NULL THEN 'NONE_RECORDED'
    WHEN t.kind = 'view'
      AND d.classid = 'pg_catalog.pg_rewrite'::regclass
      AND d.deptype = 'i'
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_rewrite rw
        WHERE rw.oid = d.objid
          AND rw.ev_class = t.object_oid
      ) THEN 'OWN_VIEW_RULE_INTERNAL'
    -- Tipo composto da propria view: dependencia interna, nao externa.
    -- Nao dispensar revisao de outros pg_type ou dependencias nao-internas.
    WHEN t.kind = 'view'
      AND d.classid = 'pg_catalog.pg_type'::regclass
      AND d.deptype = 'i'
      AND d.objsubid = 0
      AND d.refobjsubid = 0
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_type ty
        WHERE ty.oid = d.objid
          AND ty.typrelid = t.object_oid
      ) THEN 'OWN_VIEW_ROWTYPE_INTERNAL'
    ELSE 'REVIEW_DEPENDENCY'
  END AS dependency_scope,
  CASE WHEN d.objid IS NULL THEN NULL
       ELSE pg_catalog.pg_describe_object(d.classid, d.objid, d.objsubid)
  END AS dependent_object
FROM targets t
LEFT JOIN pg_catalog.pg_depend d
  ON d.refclassid = t.catalog_oid
 AND d.refobjid = t.object_oid
ORDER BY t.migration, t.object_name, dependent_object;
