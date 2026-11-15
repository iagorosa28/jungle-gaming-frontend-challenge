import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { loginSchema, registerSchema } from '@/shared/contracts/market'
import { Button } from '@/shared/components/ui/button'
import { marketApi, marketKey, sessionKey } from './api'
import { useSession, safeReturn } from './session'
import { Failure } from './components'

export function AuthPage({ register = false, returnTo }: { register?: boolean; returnTo: string }) {
  const session = useSession().data!
  const client = useQueryClient()
  const router = useRouter()
  const [validation, setValidation] = useState('')
  const mutation = useMutation({ mutationKey: [session.id, 'auth'], mutationFn: (input: unknown) => marketApi(session.id).login(input, register), onSuccess: async result => {
    await client.cancelQueries({ queryKey: marketKey(session.id) })
    client.removeQueries({ queryKey: marketKey(session.id) })
    client.setQueryData(sessionKey, result)
    await router.navigate({ to: safeReturn(returnTo) })
  } })
  return <section className="mx-auto max-w-lg"><p className="mb-3 text-primary">Sua coleção começa aqui</p><h1 className="page-title">{register ? 'Criar conta' : 'Entrar'}</h1><p className="mb-6 text-sm text-muted-foreground">Identificação fictícia para continuar sua compra. Os itens do visitante serão somados aos da conta, com limite de 10 por edição.</p>
    <form className="panel space-y-5" onSubmit={event => {
      event.preventDefault()
      const parsed = (register ? registerSchema : loginSchema).safeParse(Object.fromEntries(new FormData(event.currentTarget)))
      if (!parsed.success) { setValidation(parsed.error.issues.map(i => i.message).join(' ')); return }
      setValidation(''); mutation.mutate(parsed.data)
    }}>
      {register && <label className="form-label">Nome<input className="field" name="name" autoComplete="name" minLength={2} maxLength={80} required aria-describedby="auth-feedback" /></label>}
      <label className="form-label">E-mail<input className="field" type="email" name="email" autoComplete="username" required aria-describedby="auth-feedback" /></label>
      <label className="form-label">Senha<input className="field" type="password" name="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={8} maxLength={128} required aria-describedby="auth-feedback" /></label>
      <div id="auth-feedback">{validation && <p role="alert">{validation}</p>}{mutation.isError && <Failure error={mutation.error} />}</div>
      <Button className="w-full" disabled={mutation.isPending}>{mutation.isPending ? 'Aguarde…' : register ? 'Cadastrar e continuar' : 'Entrar e continuar'}</Button>
      <Link to={register ? '/login' : '/register'} search={{ returnTo }} className="nav-link inline-block">{register ? 'Já tenho uma conta' : 'Criar uma conta'}</Link>
    </form><p className="mt-5 text-xs leading-relaxed text-muted-foreground">Demonstração: ana@example.test ou bruno@example.test · senha Demo123!<br />Use apenas informações fictícias. Este ambiente no navegador não oferece segurança de um servidor real.</p>
  </section>
}
