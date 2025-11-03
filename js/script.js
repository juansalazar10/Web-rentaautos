// Script principal (ahora como módulo) — contiene navegación y hooks de Firebase
import { loginWithGoogle, onAuthStateChanged, createReservation, getCurrentUser, signOut, listReservationsByUser, checkAndCreateReservation, createReservationRemote, handleRedirectResult } from './firebase.js';

// Navegación suave y activa
document.addEventListener('DOMContentLoaded', function() {
    // Si se volvió de un signInWithRedirect, procesamos el resultado
    handleRedirectResult().catch(err => {
        console.error('Error processing sign-in redirect result:', err);
        // Mostrar alerta no intrusiva si hay problema con redirect
        if (err && err.code) alert(`Error al procesar inicio de sesión: ${err.code} ${err.message || ''}`);
    });
    // Obtener todos los enlaces de navegación
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link[href^="#"]');
    const sections = document.querySelectorAll('section[id]');
    
    // Función para actualizar el enlace activo
    function updateActiveLink() {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (pageYOffset >= sectionTop - 150) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    }
    
    // Actualizar al hacer scroll
    window.addEventListener('scroll', updateActiveLink);
    
    // Cerrar el menú móvil al hacer clic en un enlace
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            const navbarCollapse = document.querySelector('.navbar-collapse');
            if (navbarCollapse.classList.contains('show')) {
                const bsCollapse = new bootstrap.Collapse(navbarCollapse);
                bsCollapse.hide();
            }
        });
    });
    
    // Marcar el primer enlace como activo al cargar
    updateActiveLink();
});

// Animación de entrada para las tarjetas
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
        }
    });
}, observerOptions);

// Observar tarjetas de vehículos, sucursales y tarifas
document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.vehicle-card, .branch-card, .pricing-card');
    cards.forEach(card => {
        observer.observe(card);
    });
});

// Manejar submit del formulario de login para cerrar la modal inmediatamente
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', function(e) {
        // Prevenir comportamiento por defecto (evita recarga y posibles delays)
        e.preventDefault();

        // Aquí el formulario de login en el modal originalmente era UI-only.
        // Como estamos usando Firebase Auth con Google, cerramos la modal y
        // recomendamos usar el botón "Entrar con Google" en su lugar.
        const loginModalEl = document.getElementById('loginModal');
        if (loginModalEl) {
            const modalInstance = bootstrap.Modal.getOrCreateInstance(loginModalEl);
            modalInstance.hide();
        }
    });

    // Botón de Login con Google dentro del modal (si existe)
    const btnGoogle = document.getElementById('btnGoogleLogin');
    if (btnGoogle) {
        btnGoogle.addEventListener('click', async function() {
            try {
                const user = await loginWithGoogle();
                // Cerrar modal al autenticar
                const loginModalEl = document.getElementById('loginModal');
                if (loginModalEl) {
                    const modalInstance = bootstrap.Modal.getOrCreateInstance(loginModalEl);
                    modalInstance.hide();
                }
                // Opcional: mostrar nombre/email en consola o actualizar UI
                console.log('Autenticado:', user.email);
            } catch (err) {
                    console.error('Error login Google:', err);
                    const msg = (err && (err.message || err.code)) ? `${err.code || ''} ${err.message || ''}`.trim() : 'Error al iniciar sesión con Google.';
                    alert(msg);
                }
        });
    }

    // Reserva: conectar formulario compacto de reserva
    const reservationForm = document.querySelector('.reservation-form');
    if (reservationForm) {
        reservationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            // Leer valores simples del formulario
            const pickup = reservationForm.querySelector('input[name="pickup_date"]').value;
            const ret = reservationForm.querySelector('input[name="return_date"]').value;
            const vehicleType = reservationForm.querySelector('select[name="vehicle_type"]').value;

            const user = getCurrentUser();
            if (!user) {
                // Abrir modal de login para que el usuario se autentique
                const loginModalEl = document.getElementById('loginModal');
                if (loginModalEl) {
                    const modalInstance = new bootstrap.Modal(loginModalEl);
                    modalInstance.show();
                }
                alert('Por favor inicia sesión para completar la reserva.');
                return;
            }

            // Construir objeto de reserva
            const reservation = {
                userId: user.uid,
                vehicleType: vehicleType || null,
                pickup_date: pickup || null,
                return_date: ret || null,
                price: null,
                status: 'pending'
            };

            try {
                // Usar comprobación básica de disponibilidad antes de crear
                // Usar la Cloud Function remota para comprobación y creación atómica
                const id = await createReservationRemote(reservation);
                alert('Reserva creada (ID: ' + id + ').');
                // Limpiar formulario
                reservationForm.reset();
            } catch (err) {
                console.error('Error creando reserva:', err);
                alert(err.message || 'No se pudo crear la reserva. Revisa la consola.');
            }
        });
    }
});

// Escuchar cambios de estado de autenticación para actualizar UI si se desea
onAuthStateChanged((user) => {
    const btn = document.querySelector('button[data-bs-target="#loginModal"]');
    const btnSignOut = document.getElementById('btnSignOut');
    const btnMyRes = document.getElementById('btnMyReservations');
    if (!btn) return;
    if (user) {
        btn.innerHTML = `<i class="fas fa-user me-2"></i>${user.email.split('@')[0]}`;
        btn.classList.remove('btn-success');
        btn.classList.add('btn-outline-success');
        // mostrar botones extra
        if (btnSignOut) btnSignOut.classList.remove('d-none');
        if (btnMyRes) btnMyRes.classList.remove('d-none');
    } else {
        btn.innerHTML = `<i class="fas fa-user me-2"></i>Iniciar sesión`;
        btn.classList.remove('btn-outline-success');
        btn.classList.add('btn-success');
        if (btnSignOut) btnSignOut.classList.add('d-none');
        if (btnMyRes) btnMyRes.classList.add('d-none');
    }
});

// Cerrar sesión
const btnSignOut = document.getElementById('btnSignOut');
if (btnSignOut) {
    btnSignOut.addEventListener('click', async () => {
        try {
            await signOut();
            alert('Sesión cerrada.');
        } catch (err) {
            console.error('Error cerrando sesión:', err);
            alert('No se pudo cerrar la sesión.');
        }
    });
}

// Mostrar reservas del usuario
const btnMyRes = document.getElementById('btnMyReservations');
if (btnMyRes) {
    btnMyRes.addEventListener('click', async () => {
        const user = getCurrentUser();
        if (!user) {
            alert('Debes iniciar sesión primero.');
            return;
        }
        const modalEl = document.getElementById('reservationsModal');
        const modalInstance = new bootstrap.Modal(modalEl);
        modalInstance.show();
        const listContainer = document.getElementById('reservationsList');
        listContainer.innerHTML = '<p class="text-muted">Cargando reservas...</p>';
        try {
            const rows = await listReservationsByUser(user.uid);
            if (!rows.length) {
                listContainer.innerHTML = '<p class="text-muted">No tienes reservas.</p>';
                return;
            }
            const el = document.createElement('div');
            el.className = 'list-group';
            rows.forEach(r => {
                const item = document.createElement('div');
                item.className = 'list-group-item';
                item.innerHTML = `
                    <div class="d-flex w-100 justify-content-between">
                      <h6 class="mb-1">Reserva ${r.id}</h6>
                      <small class="text-muted">${r.status || ''}</small>
                    </div>
                    <p class="mb-1">Vehículo: ${r.vehicleType || 'N/A'}</p>
                    <small>Desde: ${r.pickup_date || '-'} — Hasta: ${r.return_date || '-'}</small>
                `;
                el.appendChild(item);
            });
            listContainer.innerHTML = '';
            listContainer.appendChild(el);
        } catch (err) {
            console.error('Error fetching reservations:', err);
            listContainer.innerHTML = '<p class="text-danger">Error cargando reservas.</p>';
        }
    });
}
