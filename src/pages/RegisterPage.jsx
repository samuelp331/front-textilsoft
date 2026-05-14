import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { notify } from '../lib/notify.js';
import { PublicPageHeader } from '../components/PublicPageHeader.jsx';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    identification: '',
    cellphone: '',
    email: '',
    rol: 'operario',
    address: '',
    password: '',
    confirmPassword: '',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (await register(form)) {
      notify.toast('Registro exitoso. Por favor inicie sesion.', 'success');
      navigate('/login');
    }
  };

  return (
    <div className="app-screen" id="registrationPage">
      <PublicPageHeader />
      <div className="registration-container">
        <h1>REGISTRATE</h1>
        <form className="registration-form" onSubmit={onSubmit}>
          <input value={form.name} onChange={set('name')} placeholder="Nombre" required />
          <input
            value={form.identification}
            onChange={set('identification')}
            placeholder="Identificación"
            required
          />
          <input value={form.cellphone} onChange={set('cellphone')} placeholder="Celular" required />
          <input type="email" value={form.email} onChange={set('email')} placeholder="Email" required />
          <select value={form.rol} onChange={set('rol')} required aria-label="Rol en el sistema">
            <option value="operario">Operario</option>
            <option value="bodeguero">Bodeguero</option>
            <option value="supervisor">Supervisor</option>
            <option value="administrador">Administrador</option>
          </select>
          <input value={form.address} onChange={set('address')} placeholder="Dirección" required />
          <input type="password" value={form.password} onChange={set('password')} placeholder="Contraseña" required />
          <input
            type="password"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            placeholder="Confirmar Contraseña"
            required
          />
          <button type="submit">INGRESAR</button>
        </form>
      </div>
    </div>
  );
}
