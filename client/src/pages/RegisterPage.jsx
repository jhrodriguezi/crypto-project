import { Link } from 'react-router-dom'
import { useState, useRef } from 'react'
import axios from 'axios'
import ReCAPTCHA from 'react-google-recaptcha'
import { validatePassword } from '../utils/validation.js'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    captcha: null,
  })
  const refCaptcha = useRef(null)
  const [errors, setErrors] = useState({})

  async function registerUser(ev) {
    ev.preventDefault()

    const validationErrors = validateForm(formData)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    try {
      await axios.post('/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      })
      alert('Registration successful. Now you can log in')
    } catch (e) {
      alert('Registration failed. Please try again later')
    }
  }

  function onChange(e) {
    const { name, value } = e.target

    setFormData({ ...formData, [name]: value })
  }

  const validateForm = (data) => {
    let errors = {}

    if (!data.name.trim()) {
      errors.name = 'El nombre es obligatorio'
    }

    if (!formData.captcha) {
      errors.captcha = 'El reCAPTCHA es obligatorio'
    }

    if (!data.email.trim()) {
      errors.email = 'El email es obligatorio'
    }

    if (!data.password.trim()) {
      errors.password = 'La contraseña es obligatoria'
    }

    if (errors.password == null && !validatePassword(data.password)) {
      errors.password = 'La contraseña debe contener al menos una letra mayúscula, una letra minúscula y un número'
    }

    return errors
  }

  return (
    <div className="mt-4 grow flex items-center justify-around">
      <div className="mb-64">
        <h1 className="text-4xl text-center mb-4">Register</h1>
        <form className="max-w-md mx-auto" onSubmit={registerUser}>
          <input
            type="text"
            name="name"
            placeholder="John Doe"
            value={formData.name}
            onChange={onChange}
          />
          {errors.name && <p>{errors.name}</p>}
          <input
            type="email"
            name="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={onChange}
          />
          {errors.email && <p>{errors.email}</p>}
          <input
            type="password"
            name="password"
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
          <button className="primary">Register</button>
          <div className="text-center py-2 text-gray-500">
            Already a member?{' '}
            <Link className="underline text-black" to={'/login'}>
              Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
