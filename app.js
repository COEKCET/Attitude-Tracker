const API = "https://script.google.com/macros/s/AKfycbxBn6GYZBdOekcj-q4NPewW99T0RUM_Z7z4gbLEdM5GS3tzLFxKG_NOviEUJKNJip8TPQ/exec";
let currentStudent = {};

function login() {

  const id = document.getElementById("id").value.trim();
  const pass = document.getElementById("pass").value.trim();

  if (!id || !pass) {
    alert("Enter credentials");
    return;
  }

  fetch(API, {
    method: "POST",
    body: JSON.stringify({
      action: "login",
      id: id,
      password: pass
    })
  })
  .then(r => r.json())
  .then(d => {

    if (!d.ok) {
      alert("Invalid Login");
      return;
    }

    /* ===== STUDENT ===== */
    if (d.role === "Student") {
      localStorage.setItem("student", JSON.stringify(d.data));
      location = "student.html";
    }

    /* ===== FACULTY ===== */
    else if (d.role === "Faculty") {
      localStorage.setItem("faculty", d.name);
      location = "faculty.html";
    }

    /* ===== ADMIN ===== */
    else if (d.role === "Admin") {
      localStorage.setItem("faculty", d.name);
      location = "admin.html";
    }
  });
}

function loadFilters(){
 fetch(API,{
  method:"POST",
  body: JSON.stringify({action:"getFilters"})
 })
 .then(r=>r.json())
 .then(d=>{
   dept.innerHTML =
     `<option value="ALL">ALL</option>` +
     d.dept.map(x=>`<option>${x}</option>`).join("");

   year.innerHTML =
     `<option value="ALL">ALL</option>` +
     d.year.map(x=>`<option>${x}</option>`).join("");

   section.innerHTML =
     `<option value="ALL">ALL</option>` +
     d.section.map(x=>`<option>${x}</option>`).join("");
 });
}

function loadStudent(){
 fetch(API,{method:"POST",body:JSON.stringify({
  action:"getStudent",roll:roll.value
 })}).then(r=>r.json()).then(d=>{
  if(!d.ok) return alert("Not Found");
  currentStudent=d.data;
  student.innerHTML=`${d.data.name} | ${d.data.dept} | ${d.data.year}-${d.data.section}`;
  loadAttitude();
 });
}

function loadAttitude(){
 fetch(API,{method:"POST",body:JSON.stringify({action:"getAttitude"})})
 .then(r=>r.json()).then(d=>{
  attitude.innerHTML="";
  (type.value=="MIS"?d.mis:d.good).forEach(a=>{
   attitude.innerHTML+=`<option value="${a.marks}">${a.name}</option>`;
  });
 });
}

function save(){

  if (!currentStudent.roll) {
    alert("Please search and select a student first");
    return;
  }

  if (!attitude.value) {
    alert("Please select an attitude");
    return;
  }

  fetch(API,{
    method:"POST",
    body:JSON.stringify({
      action:"saveRecord",
      roll: currentStudent.roll,
      name: currentStudent.name,
      dept: currentStudent.dept,
      year: currentStudent.year,
      section: currentStudent.section,
      faculty: localStorage.getItem("faculty"),
      type: type.value,
      attitude: attitude.selectedOptions[0].text,
      marks: Number(attitude.value),
      remarks: remarks.value || "-"
    })
  })
  .then(r=>r.json())
  .then(d=>{
    if(d.ok){
      alert("Saved successfully");
      remarks.value="";
    } else {
      alert("Save failed");
    }
  });
}

function viewHistory() {

  const history = document.getElementById("history");
  const rollNo = document.getElementById("roll").value.trim();

  if (!rollNo) {
    alert("Enter Roll No");
    return;
  }

  fetch(API, {
    method: "POST",
    body: JSON.stringify({
      action: "history",
      roll: rollNo
    })
  })
  .then(r => r.json())
  .then(data => {

    if (!Array.isArray(data) || data.length === 0) {
      history.innerHTML = "<p>No attitude records found</p>";
      return;
    }

    history.innerHTML = `
      <h3>Attitude History</h3>
      <table>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Attitude</th>
          <th>Marks</th>
          <th>Remarks</th>
        </tr>
        ${data.map(r => `
          <tr>
            <td>${new Date(r[0]).toLocaleDateString()}</td>
            <td>${r[7]}</td>
            <td>${r[8]}</td>
            <td>${r[9]}</td>
            <td>${r[10] || "-"}</td>
          </tr>
        `).join("")}
      </table>
    `;
  })
  .catch(err => {
    console.error(err);
    alert("Unable to load history");
  });
}

function loadReport(){

 fetch(API,{
  method:"POST",
  body:JSON.stringify({
    action:"report",
    filter:{
      dept: dept.value,
      year: year.value,
      section: section.value
    }
  })
 })
 .then(r=>r.json())
 .then(data=>{

   // Remove header row
   let rows = data.slice(1);

   // Sort by Roll No
   rows.sort((a,b)=>a[0].localeCompare(b[0]));

   // Store globally for download
   window.reportData = rows;

   // Render table
   report.innerHTML = `
     <tr>
       <th>S.No</th>
       <th>Roll No</th>
       <th>Name</th>
       <th>MIS</th>
       <th>GOOD</th>
       <th>Final</th>
     </tr>
     ${rows.map((r,i)=>`
       <tr>
         <td>${i+1}</td>
         <td>${r[0]}</td>
         <td>${r[1]}</td>
         <td>${r[5]}</td>
         <td>${r[6]}</td>
         <td>${r[7]}</td>
       </tr>
     `).join("")}
   `;
 });
}

function downloadCSV(){

 if(!window.reportData || reportData.length===0){
   alert("No data to download");
   return;
 }

 let csv = "S.No,Roll No,Name,MIS,GOOD,Final\n";

 reportData.forEach((r,i)=>{
   csv += `${i+1},${r[0]},${r[1]},${r[5]},${r[6]},${r[7]}\n`;
 });

 let blob = new Blob([csv],{type:"text/csv"});
 let a = document.createElement("a");
 a.href = URL.createObjectURL(blob);
 a.download = "Attitude_Report.csv";
 a.click();
}

async function getLogoSafe() {
  try {
    const r = await fetch("logo.jpeg");
    if (!r.ok) return null;
    const b = await r.blob();
    return await new Promise(res => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.readAsDataURL(b);
    });
  } catch {
    return null;
  }
}

async function downloadPDF(){

  if(!window.reportData || reportData.length === 0){
    alert("Load report before downloading");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("portrait", "pt", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();

  /* ===== LOGO ===== */
  const logo = await getLogoSafe();
  if (logo) {
    doc.addImage(logo, "JPEG", (pageWidth - 180) / 2, 20, 180, 55);
  }

  /* ===== TITLE ===== */
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.text(
    "Kamaraj College of Engineering and Technology",
    pageWidth / 2,
    95,
    { align: "center" }
  );

  doc.setFontSize(13);
  doc.text(
    "Attitude Performance Report",
    pageWidth / 2,
    120,
    { align: "center" }
  );

  /* ===== FILTER DETAILS ===== */
  const deptVal = dept.value || "ALL";
  const yearVal = year.value || "ALL";
  const secVal  = section.value || "ALL";

  doc.setFont("times", "normal");
  doc.setFontSize(11);

  doc.text(`Department : ${deptVal}`, 40, 150);
  doc.text(`Year : ${yearVal}`, pageWidth / 2, 150, { align: "center" });
  doc.text(`Section : ${secVal}`, pageWidth - 40, 150, { align: "right" });

  /* ===== TABLE WIDTH CALCULATION ===== */
const columnWidths = [35, 90, 160, 60, 60, 70];
const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
const leftMargin = (pageWidth - tableWidth) / 2;

doc.autoTable({
  startY: 170,
  head: [[
    "S.No",
    "Roll No",
    "Student Name",
    "MIS",
    "GOOD",
    "Final"
  ]],
  body: reportData.map((r, i) => [
    i + 1,
    r[0],
    r[1],
    r[5],
    r[6],
    r[7]
  ]),
  styles: {
    font: "times",
    fontSize: 9,
    halign: "center",
    valign: "middle",
    lineWidth: 0.5,
    lineColor: 0,
    cellPadding: 4
  },
  headStyles: {
    fontStyle: "bold",
    fillColor: [255,255,255],
    textColor: 0,
    lineWidth: 0.5
  },
  columnStyles: {
    0: { cellWidth: 35 },
    1: { cellWidth: 90 },
    2: { cellWidth: 160, halign: "left" },
    3: { cellWidth: 60 },
    4: { cellWidth: 60 },
    5: { cellWidth: 70 }
  },
  margin: { left: leftMargin }
});

  /* ===== SIGNATURE ===== */
  const signY = doc.lastAutoTable.finalY + 60;

  doc.setFont("times", "bold");
  doc.setFontSize(12);

  doc.text("Chairperson", 60, signY);
  doc.text("HoD", pageWidth - 60, signY, { align: "right" });

  /* ===== DOWNLOAD ===== */
  doc.save(`Attitude_Report_${deptVal}_${yearVal}_${secVal}.pdf`);
}

function loadAttitudeMaster(){
 fetch(API,{
  method:"POST",
  body:JSON.stringify({action:"getAttitudeMaster"})
 }).then(r=>r.json()).then(d=>{
  attTable.innerHTML =
   `<tr>
     <th>Type</th>
     <th>Attitude</th>
     <th>Marks</th>
     <th>Action</th>
   </tr>` +
   d.map(r=>`
    <tr>
      <td>${r.type}</td>
      <td><input id="name${r.row}" value="${r.attitude}"></td>
      <td><input id="marks${r.row}" type="number" value="${r.marks}"></td>
      <td>
        <button onclick="updateAttitude(${r.row})">Update</button>
        <button onclick="deleteAttitude(${r.row})">Delete</button>
      </td>
    </tr>
   `).join("");
 });
}

function addAttitude(){
 fetch(API,{
  method:"POST",
  body:JSON.stringify({
    action:"addAttitude",
    type:attType.value,
    attitude:attName.value,
    marks:attMarks.value
  })
 }).then(r=>r.json()).then(d=>{
  if(d.ok){
    attName.value="";
    attMarks.value="";
    loadAttitudeMaster();
  }
 });
}

function updateAttitude(row){
 fetch(API,{
  method:"POST",
  body:JSON.stringify({
    action:"updateAttitude",
    row:row,
    attitude:document.getElementById("name"+row).value,
    marks:document.getElementById("marks"+row).value
  })
 }).then(r=>r.json()).then(d=>{
  if(d.ok) alert("Updated");
 });
}

function deleteAttitude(row){
 if(!confirm("Delete this attitude?")) return;

 fetch(API,{
  method:"POST",
  body:JSON.stringify({
    action:"deleteAttitude",
    row:row
  })
 }).then(r=>r.json()).then(d=>{
  if(d.ok) loadAttitudeMaster();
 });
}

function logout() {
  localStorage.removeItem("student");
  localStorage.removeItem("faculty");
  location.href = "index.html";
}

async function downloadStudentPDF() {

  const student = JSON.parse(localStorage.getItem("student"));
  if (!student) {
    alert("Session expired");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("portrait", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  let y = 40;

  /* ===== TITLE ===== */
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.text("Kamaraj College of Engineering and Technology", pageWidth / 2, y, { align: "center" });

  y += 25;
  doc.setFontSize(13);
  doc.text("Student Attitude Performance Report", pageWidth / 2, y, { align: "center" });

  y += 30;

  /* ===== STUDENT INFO ===== */
  doc.setFont("times", "normal");
  doc.setFontSize(11);

  doc.text(`Name     : ${student.name}`, 50, y);
  doc.text(`Roll No  : ${student.roll}`, pageWidth - 50, y, { align: "right" });

  y += 18;
  doc.text(`Dept     : ${student.dept}`, 50, y);
  doc.text(`Year     : ${student.year}-${student.section}`, pageWidth - 50, y, { align: "right" });

  y += 25;

  /* ===== FETCH DATA ===== */
  const res = await fetch(API, {
    method: "POST",
    body: JSON.stringify({
      action: "studentDashboard",
      roll: student.roll
    })
  });

  const data = await res.json();

  /* ===== SCORE SUMMARY ===== */
  doc.setFont("times", "bold");
  doc.text("Score Summary", 50, y);
  y += 10;

  doc.autoTable({
    startY: y + 10,
    head: [["MIS Total", "GOOD Total", "Available Points"]],
    body: [[
      data.score[5],
      data.score[6],
      data.score[7]
    ]],
    styles: { font: "times", fontSize: 10, halign: "center" },
    headStyles: { fontStyle: "bold" },
    margin: { left: 50, right: 50 }
  });

  y = doc.lastAutoTable.finalY + 25;

  /* ===== ATTITUDE HISTORY ===== */
  doc.setFont("times", "bold");
  doc.text("Attitude History", 50, y);

  doc.autoTable({
    startY: y + 10,
    head: [["Date", "Type", "Attitude", "Marks"]],
    body: data.history.map(r => [
      new Date(r[0]).toLocaleDateString(),
      r[7],
      r[8],
      r[9]
    ]),
    styles: { font: "times", fontSize: 9, halign: "center" },
    columnStyles: { 2: { halign: "left" } },
    margin: { left: 50, right: 50 }
  });

  /* ===== SIGNATURE ===== */
  y = doc.lastAutoTable.finalY + 50;

  doc.setFont("times", "bold");
  doc.text("Mentor Signature", 50, y);
  doc.line(50, y + 10, 180, y + 10);

  doc.text("Student Signature", pageWidth - 180, y);
  doc.line(pageWidth - 180, y + 10, pageWidth - 50, y + 10);

  /* ===== SAVE ===== */
  doc.save(`Attitude_Report_${student.roll}.pdf`);
}

function createHoDDrafts() {

  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;

  if (!from || !to) {
    alert("Select From & To dates");
    return;
  }

  fetch(API, {
    method: "POST",
    body: JSON.stringify({
      action: "createHoDDrafts",
      from,
      to
    })
  })
  .then(r => r.json())
  .then(d => {
    if (d.ok) {
      alert("Draft mails created successfully");
    } else {
      alert("Failed to create drafts");
    }
  });
}
