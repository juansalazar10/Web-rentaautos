// Este archivo mantiene comportamiento de navegación, animaciones y modales,

// Navegación suave y activa
document.addEventListener('DOMContentLoaded', function() {
    // Nota: la autenticación remota fue eliminada en esta versión. El modal
    // de login queda solo con comportamiento visual.
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

    // Login real: enviar credenciales a /api/login y guardar token en sessionStorage
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        if (!email || !password) {
            alert('Por favor completa email y contraseña');
            return;
        }

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.error || 'Error al iniciar sesión');
                return;
            }

            const data = await res.json();
            // guardar token y user en sessionStorage (temporal para SPA)
            sessionStorage.setItem('auth', JSON.stringify({ token: data.token, user: data.user }));

            // ocultar modal
            const loginModalEl = document.getElementById('loginModal');
            if (loginModalEl) {
                const modalInstance = bootstrap.Modal.getOrCreateInstance(loginModalEl);
                modalInstance.hide();
            }

            // actualizar UI y redirigir según rol
            updateUIForAuth();
            try {
                const role = data.user && data.user.rol ? data.user.rol : 'cliente';
                if (role === 'admin') {
                    window.location.href = '/pages/admin.html';
                } else {
                    window.location.href = '/pages/user.html';
                }
            } catch (e) {
                window.location.href = '/pages/dashboard.html';
            }
        } catch (err) {
            console.error('Login error', err);
            alert('Error intentando iniciar sesión');
        }
    });

    // Sign out
    const btnSignOut = document.getElementById('btnSignOut');
    if (btnSignOut) {
        btnSignOut.addEventListener('click', async function() {
            sessionStorage.removeItem('auth');
            updateUIForAuth();
            // call optional logout endpoint
            try { await fetch('/api/logout', { method: 'POST' }); } catch(e){}
        });
    }

    // Mis reservas: abrir modal y cargar reservas del usuario
    const btnMyReservations = document.getElementById('btnMyReservations');
    if (btnMyReservations) {
        btnMyReservations.addEventListener('click', async function() {
            const auth = JSON.parse(sessionStorage.getItem('auth') || 'null');
            if (!auth || !auth.user) {
                alert('Debes iniciar sesión para ver tus reservas');
                return;
            }
            const modalEl = document.getElementById('reservationsModal');
            const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
            modalInstance.show();

            const listEl = document.getElementById('reservationsList');
            listEl.innerHTML = '<p class="text-muted">Cargando reservas...</p>';

            try {
                const res = await fetch(`/api/reservations?user_id=${encodeURIComponent(auth.user.id)}`, {
                    headers: { 'Authorization': 'Bearer ' + auth.token }
                });
                if (!res.ok) throw new Error('Error cargando reservas');
                const rows = await res.json();
                if (!rows.length) {
                    listEl.innerHTML = '<p class="text-muted">No tienes reservas.</p>';
                    return;
                }
                const html = rows.map(r => `
                    <div class="card mb-2">
                      <div class="card-body">
                        <h6 class="card-title">Reserva #${r.id} — ${r.vehicle_type}</h6>
                        <p class="card-text small text-muted">${r.pickup_date} → ${r.return_date} · ${r.status}</p>
                        <p class="mb-0">Precio: ${r.price || '-'} </p>
                      </div>
                    </div>
                `).join('');
                listEl.innerHTML = html;
            } catch (err) {
                console.error(err);
                listEl.innerHTML = '<p class="text-danger">Error cargando reservas.</p>';
            }
        });
    }

    // Al cargar la página, actualizar UI según sesión
    updateUIForAuth();


// Helper: mostrar/ocultar botones según sesión
function updateUIForAuth() {
    const auth = JSON.parse(sessionStorage.getItem('auth') || 'null');
    const btnMyReservations = document.getElementById('btnMyReservations');
    const btnSignOut = document.getElementById('btnSignOut');
    const loginButtons = document.querySelectorAll('[data-bs-target="#loginModal"], #loginModal');

    if (auth && auth.user) {
        if (btnMyReservations) btnMyReservations.classList.remove('d-none');
        if (btnSignOut) btnSignOut.classList.remove('d-none');
        // hide login triggers
        loginButtons.forEach(el => el.classList && el.classList.add('d-none'));
    } else {
        if (btnMyReservations) btnMyReservations.classList.add('d-none');
        if (btnSignOut) btnSignOut.classList.add('d-none');
        loginButtons.forEach(el => el.classList && el.classList.remove('d-none'));
    }
}
});