import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    doc, 
    updateDoc, 
    addDoc, 
    deleteDoc, 
    getDoc, 
    setDoc,
    query,
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Configuración de tu proyecto de Firebase "camaras-1d9c8"
const firebaseConfig = {
    apiKey: "AIzaSyDih3egk9LegaaiY3hAZvYYA7Omvbx05qk",
    authDomain: "camaras-1d9c8.firebaseapp.com",
    projectId: "camaras-1d9c8",
    storageBucket: "camaras-1d9c8.firebasestorage.app",
    messagingSenderId: "554283714612",
    appId: "1:554283714612:web:5c494c71496aef70cae261",
    measurementId: "G-Q0BMQRNVL2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let swiperInstances = [];

// Inicializar carruseles de fotos
function initSwipers() {
    swiperInstances.forEach(s => s.destroy(true, true));
    swiperInstances = [];

    document.querySelectorAll('.mySwiper').forEach(elem => {
        const swiper = new Swiper(elem, {
            loop: true,
            navigation: {
                nextEl: elem.querySelector('.swiper-button-next'),
                prevEl: elem.querySelector('.swiper-button-prev'),
            },
            pagination: {
                el: elem.querySelector('.swiper-pagination'),
                clickable: true
            }
        });
        swiperInstances.push(swiper);
    });
}

// Reproducción automática de videos de 2 en 2 al hacer scroll
function setupVideoObserver() {
    const videos = document.querySelectorAll("video");
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.play().catch(() => {});
            } else {
                entry.target.pause();
            }
        });
    }, { threshold: 0.4 });

    videos.forEach(v => observer.observe(v));
}

// Eventos de DOM y Lightbox
function setupDOM() {
    const modal = document.getElementById("image-modal");
    const modalImg = document.getElementById("modal-img");
    const closeModal = document.querySelector(".close-modal");

    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("expandable-img")) {
            modal.style.display = "block";
            modalImg.src = e.target.src;
        }
    });

    if (closeModal) closeModal.addEventListener("click", () => modal.style.display = "none");
    if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

    // Abrir/Cerrar Admin Modal
    const adminModal = document.getElementById("admin-modal");
    document.getElementById("open-admin-btn").addEventListener("click", () => adminModal.style.display = "block");
    document.querySelector(".close-admin").addEventListener("click", () => adminModal.style.display = "none");

    // Pestañas del Admin
    setupTabs();
}

function setupTabs() {
    const tabs = [
        { btn: "btn-tab-create", content: "tab-create-section" },
        { btn: "btn-tab-list", content: "tab-list-sections" },
        { btn: "btn-tab-logo", content: "tab-change-logo" }
    ];

    tabs.forEach(t => {
        const btnEl = document.getElementById(t.btn);
        if (btnEl) {
            btnEl.addEventListener("click", () => {
                document.querySelectorAll(".btn-tab").forEach(b => b.classList.remove("active"));
                document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
                btnEl.classList.add("active");
                document.getElementById(t.content).classList.add("active");
            });
        }
    });
}

// Firestore: Cambiar Foto de Logo
function listenHeaderLogo() {
    const logoImg = document.getElementById("main-logo");
    onSnapshot(doc(db, "settings", "header"), (docSnap) => {
        if (docSnap.exists() && logoImg) {
            const data = docSnap.data();
            if (data.logoUrl) logoImg.src = data.logoUrl;
        }
    });
}

// Firestore: Escuchar e Insertar Secciones Dinámicas abajo
function listenDynamicSections() {
    const container = document.getElementById("dynamic-sections-container");
    const adminList = document.getElementById("admin-sections-list");

    const q = query(collection(db, "sections"), orderBy("createdAt", "asc"));

    onSnapshot(q, (snapshot) => {
        if (container) container.innerHTML = "";
        if (adminList) adminList.innerHTML = "";

        snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;

            // Renderizado Vista Pública
            if (data.status === "active" || !data.status) {
                if (container) {
                    const sec = document.createElement("section");
                    sec.className = "section-card dynamic-card";

                    // Crear Swiper HTML para Imágenes
                    let swiperSlidesHTML = "";
                    if (data.images && data.images.length > 0) {
                        swiperSlidesHTML = data.images.map(url => `
                            <div class="swiper-slide"><img src="${url}" class="expandable-img" alt="Foto"></div>
                        `).join('');
                    }

                    // Crear Videos Grid HTML (2 a la par)
                    let videosHTML = "";
                    if (data.videos && data.videos.length > 0) {
                        videosHTML = data.videos.map(url => `
                            <div class="video-item"><video controls preload="metadata" muted loop src="${url}"></video></div>
                        `).join('');
                    }

                    sec.innerHTML = `
                        <h2 class="section-title">${data.title || "Sin Título"}</h2>
                        <p class="section-desc">${data.content || ""}</p>
                        ${data.images && data.images.length > 0 ? `
                            <div class="swiper mySwiper">
                                <div class="swiper-wrapper">${swiperSlidesHTML}</div>
                                <div class="swiper-button-next"></div>
                                <div class="swiper-button-prev"></div>
                                <div class="swiper-pagination"></div>
                            </div>
                        ` : ''}
                        ${data.videos && data.videos.length > 0 ? `
                            <div class="video-grid-2x2">${videosHTML}</div>
                        ` : ''}
                    `;
                    container.appendChild(sec);
                }
            }

            // Renderizado Vista Panel Admin
            if (adminList) {
                const item = document.createElement("div");
                item.className = "admin-card-item";
                item.innerHTML = `
                    <div>
                        <strong>${data.title || "Sin título"}</strong>
                        <small style="display:block; color:#94a3b8;">Estado: ${data.status === 'paused' ? 'Pausada' : 'Activa'}</small>
                    </div>
                    <div class="admin-card-actions">
                        <button class="btn-secondary" onclick="editSection('${id}')">Editar</button>
                        <button class="btn-secondary" onclick="toggleStatus('${id}', '${data.status || 'active'}')">
                            ${data.status === 'paused' ? 'Reanudar' : 'Pausar'}
                        </button>
                        <button class="btn-danger" onclick="deleteSection('${id}')">Eliminar</button>
                    </div>
                `;
                adminList.appendChild(item);
            }
        });

        initSwipers();
        setupVideoObserver();
    });
}

// Panel de Control y Formularios Dinámicos
function setupAdminLogic() {
    const loginForm = document.getElementById("login-form");
    const adminPanel = document.getElementById("admin-panel");
    const logoutBtn = document.getElementById("logout-btn");

    onAuthStateChanged(auth, (user) => {
        if (user) {
            loginForm.style.display = "none";
            adminPanel.style.display = "block";
        } else {
            loginForm.style.display = "block";
            adminPanel.style.display = "none";
        }
    });

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            try {
                await signInWithEmailAndPassword(auth, loginForm.email.value, loginForm.password.value);
                showToast("Acceso correcto");
            } catch (err) {
                showToast("Error: " + err.message);
            }
        });
    }

    if (logoutBtn) logoutBtn.addEventListener("click", () => signOut(auth));

    // Cambiar Foto Logo
    document.getElementById("logo-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const logoUrl = document.getElementById("logo-url-input").value;
        try {
            await setDoc(doc(db, "settings", "header"), { logoUrl }, { merge: true });
            showToast("Foto de logo actualizada");
            document.getElementById("logo-form").reset();
        } catch (err) {
            showToast("Error al cambiar foto");
        }
    });

    // Generar Campos de Fotos según Cantidad
    document.getElementById("generate-img-inputs").addEventListener("click", () => {
        const count = parseInt(document.getElementById("img-count-input").value) || 0;
        generateImageInputs(count);
    });

    // Agregar Video por URL
    document.getElementById("add-video-btn").addEventListener("click", () => {
        addVideoInput();
    });

    // Guardar/Actualizar Sección
    document.getElementById("section-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const editId = e.target.dataset.editId;
        const title = document.getElementById("section-title").value;
        const content = document.getElementById("section-content").value;

        // Recolectar URLs de imágenes
        const images = Array.from(document.querySelectorAll(".img-url-input"))
            .map(i => i.value.trim()).filter(v => v !== "");

        // Recolectar URLs de videos
        const videos = Array.from(document.querySelectorAll(".video-url-input"))
            .map(v => v.value.trim()).filter(v => v !== "");

        try {
            if (editId) {
                await updateDoc(doc(db, "sections", editId), { title, content, images, videos });
                showToast("Sección actualizada correctamente");
            } else {
                await addDoc(collection(db, "sections"), {
                    title,
                    content,
                    images,
                    videos,
                    status: "active",
                    createdAt: new Date()
                });
                showToast("Sección guardada correctamente");
            }
            resetSectionForm();
        } catch (err) {
            showToast("Error al guardar la sección: " + err.message);
        }
    });

    document.getElementById("cancel-edit-btn").addEventListener("click", resetSectionForm);
}

function generateImageInputs(count, existingValues = []) {
    const container = document.getElementById("image-urls-container");
    container.innerHTML = "<strong>URLs de Imágenes:</strong>";
    for (let i = 0; i < count; i++) {
        const div = document.createElement("div");
        div.className = "dynamic-url-item";
        div.innerHTML = `<input type="url" class="img-url-input" placeholder="URL Imagen ${i + 1}" value="${existingValues[i] || ''}">`;
        container.appendChild(div);
    }
}

function addVideoInput(value = "") {
    const container = document.getElementById("video-urls-container");
    const div = document.createElement("div");
    div.className = "dynamic-url-item";
    div.innerHTML = `
        <input type="url" class="video-url-input" placeholder="URL Video" value="${value}">
        <button type="button" class="btn-danger" onclick="this.parentElement.remove()">X</button>
    `;
    container.appendChild(div);
}

function resetSectionForm() {
    const form = document.getElementById("section-form");
    form.reset();
    delete form.dataset.editId;
    document.getElementById("image-urls-container").innerHTML = "";
    document.getElementById("video-urls-container").innerHTML = "";
    document.getElementById("form-section-title").textContent = "Crear Nueva Sección";
    document.getElementById("save-section-btn").textContent = "Guardar Sección";
    document.getElementById("cancel-edit-btn").style.display = "none";
    generateImageInputs(5); // Genera 5 por defecto
}

// Funciones globales para botones del Admin List
window.editSection = async (id) => {
    try {
        const docSnap = await getDoc(doc(db, "sections", id));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("section-title").value = data.title || "";
            document.getElementById("section-content").value = data.content || "";

            // Cargar fotos y videos existentes
            const images = data.images || [];
            document.getElementById("img-count-input").value = images.length || 5;
            generateImageInputs(images.length || 5, images);

            document.getElementById("video-urls-container").innerHTML = "";
            (data.videos || []).forEach(vUrl => addVideoInput(vUrl));

            const form = document.getElementById("section-form");
            form.dataset.editId = id;

            document.getElementById("form-section-title").textContent = "Editar Sección";
            document.getElementById("save-section-btn").textContent = "Actualizar Sección";
            document.getElementById("cancel-edit-btn").style.display = "inline-block";

            // Cambiar a la pestaña de formulario
            document.getElementById("btn-tab-create").click();
        }
    } catch (e) {
        showToast("Error al cargar la sección");
    }
};

window.toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "paused" ? "active" : "paused";
    await updateDoc(doc(db, "sections", id), { status: newStatus });
    showToast(`Sección ${newStatus === "paused" ? "pausada" : "activada"}`);
};

window.deleteSection = async (id) => {
    if (confirm("¿Deseas eliminar esta sección definitivamente?")) {
        await deleteDoc(doc(db, "sections", id));
        showToast("Sección eliminada");
    }
};

function showToast(msg) {
    const toast = document.getElementById("toast");
    if (toast) {
        toast.textContent = msg;
        toast.className = "show";
        setTimeout(() => toast.className = toast.className.replace("show", ""), 3000);
    }
}

// Inicialización general
document.addEventListener("DOMContentLoaded", () => {
    setupDOM();
    listenHeaderLogo();
    listenDynamicSections();
    setupAdminLogic();
    generateImageInputs(5); // Genera 5 campos de fotos inicialmente
});