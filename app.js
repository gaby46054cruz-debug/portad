import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuración de Firebase vinculada a tarjeta1-3d3f9
const firebaseConfig = {
  apiKey: "AIzaSyCSHWCKnfL531jGJJgG3lfvMUEnH58uX5A",
  authDomain: "tarjeta1-3d3f9.firebaseapp.com",
  projectId: "tarjeta1-3d3f9",
  storageBucket: "tarjeta1-3d3f9.firebasestorage.app",
  messagingSenderId: "46559227030",
  appId: "1:46559227030:web:643be363ab97b71e53a6b7",
  measurementId: "G-G0XEHY4FC6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.getElementById('year').textContent = new Date().getFullYear();

// Elementos del DOM
const adminModal = document.getElementById('adminModal');
const editModal = document.getElementById('editModal');
const openAdminBtn = document.getElementById('openAdminBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');

const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

const tabCreateBtn = document.getElementById('tabCreateBtn');
const tabListBtn = document.getElementById('tabListBtn');
const viewCreate = document.getElementById('viewCreate');
const viewList = document.getElementById('viewList');

const addServiceForm = document.getElementById('addServiceForm');
const editServiceForm = document.getElementById('editServiceForm');
const servicesContainer = document.getElementById('servicesContainer');
const adminList = document.getElementById('adminList');
const servCount = document.getElementById('servCount');

// Modales
openAdminBtn.addEventListener('click', () => adminModal.style.display = 'flex');
closeModalBtn.addEventListener('click', () => adminModal.style.display = 'none');
closeEditModalBtn.addEventListener('click', () => editModal.style.display = 'none');

// Control de Pestañas
tabCreateBtn.addEventListener('click', () => {
  tabCreateBtn.classList.add('active');
  tabListBtn.classList.remove('active');
  viewCreate.style.display = 'block';
  viewList.style.display = 'none';
});

tabListBtn.addEventListener('click', () => {
  tabListBtn.classList.add('active');
  tabCreateBtn.classList.remove('active');
  viewList.style.display = 'block';
  viewCreate.style.display = 'none';
});

// Autenticación de Usuario Admin
loginBtn.addEventListener('click', async () => {
  const email = document.getElementById('adminEmail').value.trim();
  const pass = document.getElementById('adminPassword').value.trim();

  if (!email || !pass) return alert("Completa ambos campos.");

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    console.error("Error de autenticación:", err);
    switch (err.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        alert("Usuario o contraseña incorrectos.");
        break;
      case 'auth/invalid-email':
        alert("El formato del correo electrónico no es válido.");
        break;
      case 'auth/too-many-requests':
        alert("Demasiados intentos. Esperá unos minutos.");
        break;
      default:
        alert("Error de acceso (" + err.code + "): " + err.message);
    }
  }
});

logoutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, user => {
  if (user) {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
  } else {
    loginSection.style.display = 'block';
    dashboardSection.style.display = 'none';
  }
});

// Escuchar cambios de Servicios en tiempo real desde Firestore
onSnapshot(collection(db, "servicios"), (snapshot) => {
  document.querySelectorAll('.dynamic-card').forEach(card => card.remove());
  adminList.innerHTML = '';

  let total = 0;

  snapshot.forEach(docSnap => {
    total++;
    const data = docSnap.data();
    const id = docSnap.id;
    const isPaused = data.active === false;

    // 1. Mostrar en la tarjeta pública si NO está pausado
    if (!isPaused) {
      const card = document.createElement('a');
      card.href = data.link;
      card.target = "_blank";
      card.className = "service-card dynamic-card";
      card.innerHTML = `
        <div class="service-img-wrapper">
          <img src="${data.img}" alt="${data.title}" class="service-img">
        </div>
        <div class="service-info">
          <h2 class="service-title">${data.title}</h2>
          <p class="service-desc">${data.desc}</p>
        </div>
        <div class="service-arrow">→</div>
      `;
      servicesContainer.appendChild(card);
    }

    // 2. Mostrar siempre en el Panel Admin
    const adminCard = document.createElement('div');
    adminCard.className = `admin-card ${isPaused ? 'paused' : ''}`;
    adminCard.innerHTML = `
      <div class="admin-card-header">
        <img src="${data.img}" class="admin-card-img">
        <span class="admin-card-title">${data.title}</span>
        <span class="status-badge ${isPaused ? 'paused' : 'active'}">
          ${isPaused ? 'Pausado' : 'Activo'}
        </span>
      </div>
      <div class="admin-card-actions">
        <button class="btn-sm ${isPaused ? 'btn-activate' : 'btn-pause'}" onclick="toggleStatus('${id}', ${isPaused})">
          ${isPaused ? 'Activar' : 'Pausar'}
        </button>
        <button class="btn-sm btn-edit" onclick="openEditModal('${id}', '${escapeQuotes(data.title)}', '${escapeQuotes(data.desc)}', '${data.img}', '${data.link}')">
          Editar
        </button>
        <button class="btn-sm btn-delete" onclick="deleteService('${id}')">
          Eliminar
        </button>
      </div>
    `;
    adminList.appendChild(adminCard);
  });

  servCount.textContent = total;
});

// Guardar un servicio nuevo en Firestore
addServiceForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('servTitle').value.trim();
  const desc = document.getElementById('servDesc').value.trim();
  const img = document.getElementById('servImg').value.trim();
  const link = document.getElementById('servLink').value.trim();

  try {
    await addDoc(collection(db, "servicios"), {
      title,
      desc,
      img,
      link,
      active: true,
      createdAt: new Date()
    });
    addServiceForm.reset();
    alert("¡Servicio creado exitosamente!");
    tabListBtn.click();
  } catch (error) {
    alert("Error al intentar guardar el servicio: " + error.message);
  }
});

// Cambiar estado (Pausar/Activar)
window.toggleStatus = async (id, currentIsPaused) => {
  try {
    await updateDoc(doc(db, "servicios", id), {
      active: currentIsPaused
    });
  } catch (err) {
    alert("Error al actualizar estado: " + err.message);
  }
};

// Cargar datos en el modal de edición
window.openEditModal = (id, title, desc, img, link) => {
  document.getElementById('editServId').value = id;
  document.getElementById('editServTitle').value = title;
  document.getElementById('editServDesc').value = desc;
  document.getElementById('editServImg').value = img;
  document.getElementById('editServLink').value = link;
  editModal.style.display = 'flex';
};

// Guardar cambios editados
editServiceForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('editServId').value;
  const title = document.getElementById('editServTitle').value.trim();
  const desc = document.getElementById('editServDesc').value.trim();
  const img = document.getElementById('editServImg').value.trim();
  const link = document.getElementById('editServLink').value.trim();

  try {
    await updateDoc(doc(db, "servicios", id), {
      title,
      desc,
      img,
      link
    });
    editModal.style.display = 'none';
    alert("Servicio actualizado correctamente.");
  } catch (error) {
    alert("Error al guardar la edición: " + error.message);
  }
});

// Eliminar servicio
window.deleteService = async (id) => {
  if (confirm("¿Seguro que deseas borrar este servicio?")) {
    try {
      await deleteDoc(doc(db, "servicios", id));
    } catch (err) {
      alert("Error al borrar servicio: " + err.message);
    }
  }
};

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}