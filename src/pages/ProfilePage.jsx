import { useEffect, useState } from 'react';
import { AppHeader } from '../components/AppHeader.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { notify } from '../lib/notify.js';

export function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '',
    identification: '',
    cellphone: '',
    jobTitle: '',
    email: '',
    address: '',
    entryDate: '',
    photoBase64: '',
  });

  const fill = (data) => {
    setForm({
      name: data.name || '',
      identification: data.identification || '',
      cellphone: data.cellphone || '',
      jobTitle: data.jobTitle || '',
      email: data.email || '',
      address: data.address || '',
      entryDate: data.entryDate || '',
      photoBase64: data.photoBase64 || '',
    });
  };

  useEffect(() => {
    const load = async () => {
      if (user) {
        fill({
          name: user.name,
          identification: user.identification,
          cellphone: user.cellphone,
          jobTitle: user.jobTitle,
          email: user.email,
          address: user.address,
          entryDate: user.entryDate,
          photoBase64: '',
        });
      }
      try {
        const p = await api.get('/profile/me');
        fill({
          name: p.nombre,
          email: p.email,
          identification: p.identificacion,
          cellphone: p.celular,
          jobTitle: p.cargo,
          address: p.direccion,
          entryDate: p.fecha_contratacion,
          photoBase64: p.foto_base64,
        });
      } catch {
        /* fallback ya aplicado desde user */
      }
    };
    load();
  }, [user]);

  const onPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        setForm((f) => ({ ...f, photoBase64: dataUrl }));
        try {
          await api.patch('/profile/me', { foto_base64: dataUrl });
          notify.toast('Foto actualizada.', 'success');
        } catch (error) {
          notify.toast(`No se pudo guardar la foto: ${error.message}`, 'error');
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const previewStyle = form.photoBase64
    ? {
        backgroundImage: `url(${form.photoBase64})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {};

  return (
    <div className="app-screen" id="profilePage">
      <AppHeader />
      <div className="ts-page-title-block">
        <h1>
          <i className="fa-solid fa-user" style={{ marginRight: '10px', color: 'var(--button-color)' }} aria-hidden />
          Perfil de usuario
        </h1>
        <p>Datos sincronizados con el servidor. Podés actualizar la foto de perfil.</p>
      </div>
      <div className="profile-content">
        <h2>Tus datos</h2>
        <form
          className="profile-form"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div className="photo-upload">
            <div className="photo-preview" style={previewStyle} />
            <button type="button" onClick={onPhoto}>
              <i className="fa-solid fa-camera" style={{ marginRight: '8px' }} aria-hidden />
              Actualizar foto
            </button>
          </div>
          <div className="form-grid">
            <label htmlFor="profileName">Nombre:</label>
            <input id="profileName" value={form.name} readOnly placeholder="Nombre" />
            <label htmlFor="profileIdentification">Identificación:</label>
            <input id="profileIdentification" value={form.identification} readOnly />
            <label htmlFor="profileCellphone">Celular:</label>
            <input id="profileCellphone" value={form.cellphone} readOnly />
            <label htmlFor="profileJobTitle">Cargo:</label>
            <input id="profileJobTitle" value={form.jobTitle} readOnly />
            <label htmlFor="profileEmail">Email:</label>
            <input id="profileEmail" type="email" value={form.email} readOnly />
            <label htmlFor="profileAddress">Dirección:</label>
            <input id="profileAddress" value={form.address} readOnly />
            <label htmlFor="profileEntryDate">Fecha de Contratación:</label>
            <input id="profileEntryDate" type="date" value={form.entryDate || ''} readOnly />
          </div>
        </form>
      </div>
    </div>
  );
}
