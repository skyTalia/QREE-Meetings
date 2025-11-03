const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModal");
const modal = document.getElementById("meetingModal");
const meetingForm = document.getElementById("meetingForm");
const todayContainer = document.getElementById("todayMeetings");
const upcomingContainer = document.getElementById("upcomingMeetings");
const completedContainer = document.getElementById("completedMeetings");
const searchInput = document.getElementById("searchInput");

let meetings = JSON.parse(localStorage.getItem("meetings")) || [];
let editMode = false;
let editId = null;

/* ---------- Modal Controls ---------- */
openModalBtn.addEventListener("click", () => {
  document.getElementById("modalTitle").textContent = "Add New Meeting";
  meetingForm.reset();
  editMode = false;
  modal.style.display = "flex";
});

closeModalBtn.addEventListener("click", () => (modal.style.display = "none"));
window.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });

/* ---------- Add/Edit Meeting ---------- */
meetingForm.addEventListener("submit", e => {
  e.preventDefault();

  const datetime = document.getElementById("datetime").value;
  const meetingLink = document.getElementById("meetingLink").value.trim();
  const attendees = document.getElementById("attendees").value.trim().split("\n").filter(a => a);

  if (!datetime || !meetingLink) {
    alert("Please fill in all required fields.");
    return;
  }

  if (editMode && editId) {
    meetings = meetings.map(m => m.id === editId ? { ...m, datetime, meetingLink, attendees } : m);
  } else {
    meetings.push({
      id: Date.now(),
      datetime,
      meetingLink,
      attendees,
      done: false,
      cancelled: false,
      notes: ""
    });
  }

  saveMeetings();
  renderMeetings();
  meetingForm.reset();
  modal.style.display = "none";
});

/* ---------- Render Meetings ---------- */
function renderMeetings(filterText = "") {
  todayContainer.innerHTML = "";
  upcomingContainer.innerHTML = "";
  completedContainer.innerHTML = "";

  const now = new Date();
  const todayDate = now.toISOString().split("T")[0];

  meetings
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
    .forEach(meeting => {
      if (filterText && !matchSearch(meeting, filterText)) return;

      const meetingTime = new Date(meeting.datetime);
      const meetingDate = meeting.datetime.split("T")[0];

      let status = meeting.cancelled ? "❌ Cancelled" :
        meeting.done ? "✅ Done" :
        meetingTime > now ? "🕐 Upcoming" : "🟢 Ongoing";

      const formattedDate = meetingTime.toLocaleString([], {
        weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
      });

      const attendeeList = meeting.attendees.map(a => `• ${a}`).join("<br>");

      const card = document.createElement("div");
      card.classList.add("event-card");
      if (meeting.cancelled) card.classList.add("cancelled");
      if (meeting.done) card.classList.add("done");

      card.innerHTML = `
        <button class="card-delete-btn" onclick="event.stopPropagation(); deleteMeeting(${meeting.id})">×</button>
        <h3>${formattedDate}</h3>
        <p><b>Attendees:</b><br>${attendeeList || "None"}</p>
        <p><b>Link:</b> <a href="${meeting.meetingLink}" target="_blank">${meeting.meetingLink}</a></p>
        <p class="status"><b>Status:</b> ${status}</p>
        <div class="event-actions">
            <button class="btn-edit" onclick="event.stopPropagation(); editMeeting(${meeting.id})">Edit</button>
            <button class="btn-done" onclick="event.stopPropagation(); markDone(${meeting.id})">Done</button>
            <button class="btn-cancel" onclick="event.stopPropagation(); cancelMeeting(${meeting.id})">Cancel</button>
        </div>
    
      `;

      card.addEventListener("click", () => openNotes(meeting.id));

      if (meeting.done) completedContainer.appendChild(card);
      else if (meetingDate === todayDate) todayContainer.appendChild(card);
      else if (meetingTime > now) upcomingContainer.appendChild(card);
    });
}

/* ---------- Actions ---------- */
function editMeeting(id) {
  const m = meetings.find(meeting => meeting.id === id);
  if (!m) return;
  editMode = true;
  editId = id;
  document.getElementById("modalTitle").textContent = "Edit Meeting";
  document.getElementById("datetime").value = m.datetime;
  document.getElementById("meetingLink").value = m.meetingLink;
  document.getElementById("attendees").value = m.attendees.join("\n");
  modal.style.display = "flex";
}

function markDone(id) {
  meetings = meetings.map(m => m.id === id ? { ...m, done: true, cancelled: false } : m);
  saveMeetings();
  renderMeetings();
}

function cancelMeeting(id) {
  meetings = meetings.map(m => m.id === id ? { ...m, cancelled: true, done: false } : m);
  saveMeetings();
  renderMeetings();
}

function deleteMeeting(id) {
  if (confirm("Delete this cancelled meeting permanently?")) {
    meetings = meetings.filter(m => m.id !== id);
    saveMeetings();
    renderMeetings();
  }
}

/* ---------- Notes Modal ---------- */
const notesModal = document.getElementById("notesModal");
const closeNotesModal = document.getElementById("closeNotesModal");
const notesMeetingInfo = document.getElementById("notesMeetingInfo");
const notesTextarea = document.getElementById("notesTextarea");
let activeMeetingId = null;

function openNotes(meetingId) {
  const m = meetings.find(meeting => meeting.id === meetingId);
  if (!m) return;

  activeMeetingId = meetingId;
  notesMeetingInfo.innerHTML = `
    <b>Date:</b> ${new Date(m.datetime).toLocaleString([], {
      weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    })}<br>
    <b>Meeting Link:</b> <a href="${m.meetingLink}" target="_blank">${m.meetingLink}</a><br>
    <b>Attendees:</b><br>${m.attendees.map(a => `• ${a}`).join("<br>")}
  `;

  notesTextarea.value = m.notes || "";
  notesModal.style.display = "flex";
}

closeNotesModal.addEventListener("click", () => (notesModal.style.display = "none"));
window.addEventListener("click", e => { if (e.target === notesModal) notesModal.style.display = "none"; });

notesTextarea.addEventListener("input", () => {
  if (activeMeetingId !== null) {
    meetings = meetings.map(m =>
      m.id === activeMeetingId ? { ...m, notes: notesTextarea.value } : m
    );
    saveMeetings();
  }
});

/* ---------- Search ---------- */
searchInput.addEventListener("input", e => {
  renderMeetings(e.target.value.trim().toLowerCase());
});

function matchSearch(m, text) {
  return (
    m.attendees.some(a => a.toLowerCase().includes(text)) ||
    (m.notes && m.notes.toLowerCase().includes(text))
  );
}

/* ---------- Firestore Sync (v11 compatible) ---------- */

// Save to Firestore
async function saveMeetings() {
  try {
    const { collection, getDocs, addDoc, deleteDoc } = window.firestoreFns;
    const colRef = collection(db, "meetings");

    // Clear current docs to prevent duplicates
    const snap = await getDocs(colRef);
    for (const docSnap of snap.docs) {
      await deleteDoc(docSnap.ref);
    }

    // Re-upload all meetings
    for (const m of meetings) {
      await addDoc(colRef, m);
    }

    console.log("✅ Meetings saved to Firestore");
  } catch (err) {
    console.error("❌ Error saving to Firestore:", err);
  }
}

// Load from Firestore
function loadMeetings() {
  const { collection, onSnapshot } = window.firestoreFns;
  const colRef = collection(db, "meetings");

  onSnapshot(colRef, (snapshot) => {
    meetings = snapshot.docs.map(doc => doc.data());
    renderMeetings();
  });
}

// Load from Firestore when page opens
loadMeetings();


