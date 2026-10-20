---
impacto: nada_mudou
secao: corrigido
titulo: Diagnóstico mais preciso das falhas intermitentes de autenticação
---

O ELUS passa a registrar a duração e a concorrência das requisições críticas ao Supabase somente quando lentas ou com falha. Os registros distinguem o tempo do transporte do tempo da validação de sessão, sem divulgar credenciais, dados de clientes ou conteúdo de requisições. Não altera permissões, regras de MFA, timeout, módulo VendaERP nem exige configuração adicional.
