// ==================== DATOS INICIALES ====================
const tbody = document.getElementById('ranking-table-body');

// ==================== FUNCIONES AUXILIARES (Dropdowns dinámicos) ====================
function updateOpponentDropdowns() {
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const teamNamesList = [];
  
  rows.forEach((row, idx) => {
    const nameInput = row.querySelector('input[type="text"]');
    let rawName = nameInput ? nameInput.value.trim() : '';
    if (rawName === '') rawName = `Team ${idx + 1}`;
    teamNamesList.push(rawName);
  });
  
  rows.forEach((row) => {
    const opponentSelect = row.querySelector('.opponent-select');
    if (!opponentSelect) return;
    const currentSelected = opponentSelect.value;
    opponentSelect.innerHTML = '';
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '— Select Opponent —';
    defaultOption.disabled = true;
    defaultOption.selected = (currentSelected === '');
    opponentSelect.appendChild(defaultOption);
    
    teamNamesList.forEach((teamName) => {
      const option = document.createElement('option');
      option.value = teamName;
      option.textContent = teamName;
      if (currentSelected === teamName) option.selected = true;
      opponentSelect.appendChild(option);
    });
  });
}

function attachNameInputListeners() {
  const nameInputs = document.querySelectorAll('#ranking-table-body input[type="text"]');
  nameInputs.forEach(input => {
    input.removeEventListener('input', updateOpponentDropdowns);
    input.addEventListener('input', updateOpponentDropdowns);
  });
}
/*
// ==================== LOGICA DE PLAYOFFS  ====================
function getAllTeamsData() {
  const rows = tbody.querySelectorAll('tr');
  const teams = [];
  rows.forEach(row => {
    const nameInput = row.querySelector('input[type="text"]');
    const pointsInput = row.querySelector('.points-input');
    let name = nameInput ? nameInput.value.trim() : '';
    if (name === '') name = 'Unnamed Team';
    let points = pointsInput ? parseInt(pointsInput.value, 10) : 0;
    if (isNaN(points)) points = 0;
    
    const diffInput = row.querySelector('.diff-input');
    let differential = diffInput ? parseInt(diffInput.value, 10) : 0;
    if (isNaN(differential)) differential = 0;
    
    const opponentSelect = row.querySelector('.opponent-select');
    let opponent = opponentSelect ? opponentSelect.value : '';
    
    teams.push({ name, points, differential, opponent });
  });
  return teams;
}

function simulateStandings(teamsData, results) {
  const updated = teamsData.map((team, idx) => {
    let add = 0;
    switch (results[idx]) {
      case 'win': add = 2; break;
      case 'draw': add = 1; break;
      case 'loss': add = 0; break;
      default: add = 0;
    }
    return { name: team.name, finalPoints: team.points + add };
  });
  updated.sort((a, b) => b.finalPoints - a.finalPoints);
  return updated;
}

function analyzeScenario(teamIndex, teamsData, myResult) {
  const N = teamsData.length;
  const myCurrentPoints = teamsData[teamIndex].points;
  let myFinalPoints;
  switch (myResult) {
    case 'win': myFinalPoints = myCurrentPoints + 2; break;
    case 'draw': myFinalPoints = myCurrentPoints + 1; break;
    case 'loss': myFinalPoints = myCurrentPoints + 0; break;
  }

  const worstResults = Array(N).fill('win');
  worstResults[teamIndex] = myResult;
  const worstStandings = simulateStandings(teamsData, worstResults);
  const myPosWorst = worstStandings.findIndex(t => t.name === teamsData[teamIndex].name) + 1;
  const guaranteed = myPosWorst <= 4;
  
  if (guaranteed) {
    return { guaranteed: true, tiebreakPossibility: false, conditionsRequired: 0, conditionsList: [], elimination: false };
  }

  let rivals = [];
  for (let i = 0; i < N; i++) {
    if (i === teamIndex) continue;
    const otherPoints = teamsData[i].points;
    const maxOther = otherPoints + 2;
    if (maxOther > myFinalPoints) {
      rivals.push({ index: i, name: teamsData[i].name, current: otherPoints });
    }
  }

  let necessaryConditions = [];
  for (let rival of rivals) {
    const rPoints = rival.current;
    const winP = rPoints + 2;
    const drawP = rPoints + 1;
    if (winP > myFinalPoints) {
      if (drawP > myFinalPoints) necessaryConditions.push(`${rival.name} loses`);
      else if (drawP === myFinalPoints) necessaryConditions.push(`${rival.name} draws or loses`);
      else necessaryConditions.push(`${rival.name} draws or loses`);
    } else if (winP === myFinalPoints) {
      if (drawP > myFinalPoints) necessaryConditions.push(`${rival.name} loses`);
      else if (drawP === myFinalPoints) {}
      else necessaryConditions.push(`${rival.name} draws or loses`);
    }
  }

  let countSuperiorsInWorst = 0;
  for (let rival of rivals) {
    const rPoints = rival.current;
    const winP = rPoints + 2;
    const drawP = rPoints + 1;
    if (winP > myFinalPoints) countSuperiorsInWorst++;
    else if (winP === myFinalPoints && drawP > myFinalPoints) countSuperiorsInWorst++;
  }
  const conditionsNeeded = Math.max(0, countSuperiorsInWorst - 3);
  
  if (conditionsNeeded === 0) {
    return { guaranteed: false, tiebreakPossibility: true, conditionsRequired: 0, conditionsList: [], elimination: false };
  }
  if (conditionsNeeded > necessaryConditions.length) {
    return { guaranteed: false, tiebreakPossibility: false, conditionsRequired: 0, conditionsList: [], elimination: true };
  }
  
  return {
    guaranteed: false,
    tiebreakPossibility: true,
    conditionsRequired: conditionsNeeded,
    conditionsList: necessaryConditions,
    elimination: false
  };
}

function getScenarioText(teamName, teamIndex, teamsData, result) {
  const scenario = analyzeScenario(teamIndex, teamsData, result);
  const resultLabel = result === 'win' ? 'WIN' : (result === 'draw' ? 'DRAW' : 'LOSS');
  let text = `<strong>${teamName}</strong> - IF THEY ${resultLabel}:<br>`;
  
  if (result === 'loss') {
    text += '❌ No playoff chances. They are eliminated.<br>';
    return text;
  }
  if (scenario.guaranteed) {
    text += '✅ Automatically qualified to playoffs!<br>';
    return text;
  }
  if (scenario.elimination) {
    text += '❌ Even with this result, they cannot reach top 4. Eliminated.<br>';
    return text;
  }
  if (scenario.tiebreakPossibility) {
    if (scenario.conditionsRequired === 0) {
      text += '🔄 They aim for a tiebreak (at least tied with 4th place) automatically.<br>';
    } else {
      text += `🔄 They qualify for tiebreak if at least ${scenario.conditionsRequired} of the following scenarios happen:<br><ul>`;
      scenario.conditionsList.slice(0, scenario.conditionsRequired).forEach(cond => {
        text += `<li>${cond}</li>`;
      });
      text += `</ul>If none of those happen, they are eliminated.<br>`;
    }
  } else {
    text += '❌ No chance to qualify or tiebreak.<br>';
  }
  return text;
}

function showPlayoffOdds(teamName, teamIndex, allTeamsData) {
  let output = `<div class="playoff-analysis"><strong>📊 PLAYOFF SCENARIOS FOR ${teamName}</strong><br><br>`;
  output += getScenarioText(teamName, teamIndex, allTeamsData, 'win');
  output += '<br>';
  output += getScenarioText(teamName, teamIndex, allTeamsData, 'draw');
  output += '<br>';
  output += getScenarioText(teamName, teamIndex, allTeamsData, 'loss');
  output += '</div>';
  updateOutputPanel(output);
}*/

// ==================== FUNCIONES DE ORDENAMIENTO ====================
function sortTableByPoints() {
  const rows = Array.from(tbody.querySelectorAll('tr'));
  
  // Extraer datos de cada fila para ordenar
  const rowsData = rows.map(row => {
    const pointsInput = row.querySelector('.points-input');
    let points = pointsInput ? parseInt(pointsInput.value, 10) : 0;
    if (isNaN(points)) points = 0;
    
    const diffInput = row.querySelector('.diff-input');
    let differential = diffInput ? parseInt(diffInput.value, 10) : 0;
    if (isNaN(differential)) differential = 0;
    
    const nameInput = row.querySelector('input[type="text"]');
    let teamName = nameInput ? nameInput.value.trim() : '';
    if (teamName === '') {
      // Si no tiene nombre, usar un nombre temporal para ordenar
      const index = rows.indexOf(row);
      teamName = `Team ${index + 1}`;
    }
    
    return { row, points, differential, teamName };
  });
  
  // Ordenar: puntos descendente, luego differential descendente, luego nombre alfabético ascendente
  rowsData.sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.differential !== b.differential) return b.differential - a.differential;
    return a.teamName.localeCompare(b.teamName);
  });
  
  // Reordenar el DOM
  rowsData.forEach(item => {
    tbody.appendChild(item.row);
  });
  
  // Actualizar números de rank
  updateRanks();
  // Actualizar dropdowns de Opponent para reflejar nuevo orden y posibles cambios de nombre
  updateOpponentDropdowns();
  // Reasignar listeners a los inputs de nombre
  attachNameInputListeners();
}

function updateRanks() {
  const rows = tbody.querySelectorAll('tr');
  rows.forEach((row, idx) => {
    const rankSpan = row.querySelector('.badge-rank');
    if (rankSpan) rankSpan.textContent = (idx + 1).toString();
  });
}

function updateOutputPanel(htmlContent) {
  const outputContainer = document.getElementById('dynamicOutputArea');
  if (outputContainer) {
    outputContainer.innerHTML = `<div class="fade-in">${htmlContent}</div>`;
    outputContainer.style.transition = 'all 0.2s ease';
    outputContainer.style.backgroundColor = '#2a373f';
    setTimeout(() => {
      outputContainer.style.backgroundColor = '#2a2a2a';
    }, 300);
  }
}

function injectLoremIpsum() {
  const loremText = `
    <p><strong>Test (Lorem Ipsum)</strong></p>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
  `;
  updateOutputPanel(loremText);
}

// ==================== CREAR TABLA (con Differential y Opponent) ====================
function createTable() {
  tbody.innerHTML = '';
  for (let i = 1; i <= 8; i++) {
    const tr = document.createElement('tr');
    
    const tdRank = document.createElement('td');
    tdRank.className = "text-center fw-bold";
    tdRank.innerHTML = `<span class="badge-rank">${i}</span>`;
    
    const tdTeam = document.createElement('td');
    const teamInput = document.createElement('input');
    teamInput.type = 'text';
    teamInput.className = 'form-control form-control-sm-custom';
    teamInput.placeholder = `Team ${i}`;
    teamInput.value = '';
    tdTeam.appendChild(teamInput);
    
    const tdPoints = document.createElement('td');
    const pointsInput = document.createElement('input');
    pointsInput.type = 'number';
    pointsInput.className = 'form-control form-control-sm-custom text-center points-input';
    pointsInput.placeholder = 'Points';
    pointsInput.step = '1';
    pointsInput.value = '';
    tdPoints.appendChild(pointsInput);
    
    const tdDiff = document.createElement('td');
    const diffInput = document.createElement('input');
    diffInput.type = 'number';
    diffInput.className = 'form-control form-control-sm-custom text-center diff-input';
    diffInput.placeholder = 'Diff';
    diffInput.step = '1';
    diffInput.value = '0';
    tdDiff.appendChild(diffInput);
    
    const tdOpponent = document.createElement('td');
    const opponentSelect = document.createElement('select');
    opponentSelect.className = 'form-select-sm-custom opponent-select w-100';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '— Select Opponent —';
    defaultOpt.disabled = true;
    defaultOpt.selected = true;
    opponentSelect.appendChild(defaultOpt);
    tdOpponent.appendChild(opponentSelect);
    
    const tdButton = document.createElement('td');
    const rowBtn = document.createElement('button');
    rowBtn.type = 'button';
    rowBtn.className = 'btn btn-sm-icon w-100';
    rowBtn.innerHTML = 'Calculate Odds';
    rowBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const teamName = teamInput.value.trim() !== "" ? teamInput.value.trim() : `Team #${i}`;
      const pointsVal = parseInt(pointsInput.value, 10);
      if (isNaN(pointsVal) || pointsVal < 0) {
        updateOutputPanel(`⚠️ Error: <strong>"${teamName}"</strong> points are not valid. Please enter a non-negative number.`);
        return;
      }
      const allTeams = getAllTeamsData();
      const currentRowIndex = Array.from(tbody.children).indexOf(tr);
      showPlayoffOdds(teamName, currentRowIndex, allTeams);
    });
    tdButton.appendChild(rowBtn);
    
    tr.appendChild(tdRank);
    tr.appendChild(tdTeam);
    tr.appendChild(tdPoints);
    tr.appendChild(tdDiff);
    tr.appendChild(tdOpponent);
    tr.appendChild(tdButton);
    tbody.appendChild(tr);
  }
  
  updateOpponentDropdowns();
  attachNameInputListeners();
}

// ==================== INICIALIZACIÓN ====================
createTable();

const sortBtn = document.getElementById('sortButton');
if (sortBtn) {
  sortBtn.addEventListener('click', () => {
    sortTableByPoints();
    updateOutputPanel(`<strong>Teams have been sorted by points, then differential, then team name (highest to lowest).</strong>`);
  });
}

const generateBtn = document.getElementById('mainGenerateBtn');
if (generateBtn) {
  generateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    injectLoremIpsum();
  });
}

console.log('✅ Playoffs calculator loaded - Sort mejorado (Points > Differential > Name) y select centrado.');