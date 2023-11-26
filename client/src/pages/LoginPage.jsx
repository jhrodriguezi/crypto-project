import axios from 'axios'
import { useContext, useRef, useState } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'
import { Link, Navigate } from 'react-router-dom'
import { UserContext } from '../UserContext.jsx'
import { validatePassword } from '../utils/validation.js'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    captcha: null,
  })
  const [errors, setErrors] = useState({})
  const refCaptcha = useRef(null)
  const [redirect, setRedirect] = useState(false)
  const { setUser } = useContext(UserContext)

  async function handleLoginSubmit(ev) {
    ev.preventDefault()

    const validationErrors = validateForm(formData)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    try {
      const { data } = await axios.post('/login', { "email": formData.email, "password": formData.password })
      setUser(data)
      alert('Login successful')
      setRedirect(true)
    } catch (e) {
      alert('Login failed')
    }
  }

  function validateForm(data) {
    let errors = {}

    if (!data.email.trim()) {
      errors.email = 'El email es obligatorio'
    }

    if (!data.password.trim()) {
      errors.password = 'La contraseña es obligatoria'
    }

    if (errors.password == null && !validatePassword(data.password)) {
      errors.password =
        'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número'
    }

    if (!data.captcha) {
      errors.captcha = 'El reCAPTCHA es obligatorio'
    }

    return errors
  }

  function onChange(e) {
    const { name, value } = e.target

    setFormData({ ...formData, [name]: value })
  }

  if (redirect) {
    return <Navigate to={'/'} />
  }

  return (
    <div className="mt-4 grow flex items-center justify-around">
      <div className="mb-64">
        <h1 className="text-4xl text-center mb-4">Login</h1>
        <form className="max-w-md mx-auto" onSubmit={handleLoginSubmit}>
          <input
            type="email"
            name='email'
            placeholder="your@email.com"
            value={formData.email}
            onChange={onChange}
          />
          {errors.email && <p>{errors.email}</p>}
          <input
            type="password"
            name='password'
            placeholder="password"
            value={formData.password}
            onChange={onChange}
          />
          {errors.password && <p>{errors.password}</p>}
          <div
            className="grid place-items-center"
            style={{
              marginTop: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div className="max-w-md">
              <ReCAPTCHA
                name="captcha"
                ref={refCaptcha}
                sitekey="6Le3WxwpAAAAAKb6OwOGlLaIu233RDxxJeqmuEt2"
                onChange={(token) =>
                  setFormData({ ...formData, captcha: token ? true : false })
                }
              />
            </div>
            {errors.captcha && <p>{errors.captcha}</p>}
          </div>
          <button className="primary">Login</button>
          <div className="text-center py-2 text-gray-500">
            Don't have an account yet?{' '}
            <Link className="underline text-black" to={'/register'}>
              Register now
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
