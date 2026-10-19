---
impacto: nada_mudou
secao: corrigido
titulo: Navegação deixa de aguardar o timeout do Cloudflare quando Supabase Auth oscila
---

O ELUS limita a espera de verificação/renovação de sessão e das consultas de
identidade indispensáveis à navegação. Se o Supabase estiver temporariamente
indisponível, devolve erro transitório (503) com possibilidade de nova tentativa,
em vez de manter requisições presas até o erro 524 ou simular logout/acesso
proibido. Sessão inválida continua exigindo login; não existe modo offline de
autenticação, cache de permissões ou bypass de autorização. Nenhuma variável nova
precisa ser configurada. A mitigação requer nova imagem do app e validação real
após CI, merge e deploy; não corrige indisponibilidade do próprio Supabase.
