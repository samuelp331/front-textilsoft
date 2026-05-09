const profile = (() => {
    function fillForm(data) {
        const setVal = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        };

        setVal('profileName', data.name);
        setVal('profileIdentification', data.identification);
        setVal('profileCellphone', data.cellphone);
        setVal('profileJobTitle', data.jobTitle);
        setVal('profileEmail', data.email);
        setVal('profileAddress', data.address);
        setVal('profileEntryDate', data.entryDate);

        const photoPreview = document.querySelector('.photo-preview');
        if (photoPreview) {
            if (data.photoBase64) {
                photoPreview.style.backgroundImage = `url(${data.photoBase64})`;
                photoPreview.style.backgroundSize = 'cover';
                photoPreview.style.backgroundPosition = 'center';
            } else {
                photoPreview.style.backgroundImage = 'none';
            }
        }
    }

    async function fetchProfile() {
        try {
            const p = await apiClient.get('/profile/me');
            const mapped = {
                name: p.nombre,
                email: p.email,
                identification: p.identificacion,
                cellphone: p.celular,
                jobTitle: p.cargo,
                address: p.direccion,
                entryDate: p.fecha_contratacion,
                photoBase64: p.foto_base64,
            };
            fillForm(mapped);
        } catch (error) {
            const user = typeof auth !== 'undefined' ? auth.currentUser : null;
            if (user) {
                fillForm(user);
            }
        }
    }

    async function loadProfileData(userData) {
        if (userData) fillForm(userData);
        await fetchProfile();
    }

    function clearProfileFields() {
        fillForm({
            name: '',
            identification: '',
            cellphone: '',
            jobTitle: '',
            email: '',
            address: '',
            entryDate: '',
            photoBase64: '',
        });
    }

    function initPhotoUpdate() {
        const updatePhotoBtn = document.getElementById('updatePhotoBtn');
        const photoPreview = document.querySelector('.photo-preview');
        if (!updatePhotoBtn || !photoPreview) return;

        const newBtn = updatePhotoBtn.cloneNode(true);
        updatePhotoBtn.parentNode.replaceChild(newBtn, updatePhotoBtn);

        newBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';

            input.onchange = async (e) => {
                const file = e.target.files ? e.target.files[0] : null;
                if (!file || !file.type.startsWith('image/')) return;

                const reader = new FileReader();
                reader.onload = async (event) => {
                    const dataUrl = event.target.result;
                    photoPreview.style.backgroundImage = `url(${dataUrl})`;
                    photoPreview.style.backgroundSize = 'cover';
                    photoPreview.style.backgroundPosition = 'center';

                    try {
                        await apiClient.patch('/profile/me', { foto_base64: dataUrl });
                    } catch (error) {
                        alert(`No se pudo guardar la foto en backend: ${error.message}`);
                    }
                };
                reader.readAsDataURL(file);
            };
            input.click();
        });
    }

    function initProfile() {
        initPhotoUpdate();
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => e.preventDefault());
        }
    }

    return {
        loadProfileData,
        clearProfileFields,
        initProfile,
    };
})();

window.initProfile = profile.initProfile;
