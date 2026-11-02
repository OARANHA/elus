-- ELUS v1.89 — inventario de dependencias de catalogo, SOMENTE LEITURA.
-- Inspecionar em sessao/transaction READ ONLY no clone autorizado PG15/PG17.
-- Nao executa migrations, nao consulta tabelas de clientes e nao aprova DROP.
-- pg_depend aponta dependencias registradas no catalogo, nao chamadas dinamicas
-- em codigo TS/PLpgSQL nem prova de compatibilidade funcional.
-- Um alvo ABSENT nao significa que o replay pode prosseguir.
-- Nao comparar d.objid com o OID do alvo: sao OIDs de catalogos distintos;
-- coincidencia numerica pode ocultar uma dependencia valida.
-- Regras internas de views podem aparecer; deptype e catalogo exigem triagem.
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
  CASE WHEN t.object_oid IS NULL THEN 'ABSENT' ELSE 'PRESENT' END AS target_state,
  d.deptype AS dependency_type,
  d.classid::regclass::text AS dependent_catalog,
  d.objid AS dependent_oid,
  d.objsubid AS dependent_subid,
  d.refobjsubid AS target_column_subid,
  CASE WHEN d.objid IS NULL THEN NULL
       ELSE pg_catalog.pg_describe_object(d.classid, d.objid, d.objsubid)
  END AS dependent_object
FROM targets t
LEFT JOIN pg_catalog.pg_depend d
  ON d.refclassid = t.catalog_oid
 AND d.refobjid = t.object_oid
ORDER BY t.migration, t.object_name, dependent_object;
