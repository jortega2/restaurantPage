import './initialPage.css';
import falloutLogo from './imgs/fallout.png';
import locationImg from './imgs/diamondcity.jpg';

function createHeader() {
  const header = document.createElement('div');
  header.classList.add('header');
  header.classList.add('glow');

  const titleBG = document.createElement('div');
  titleBG.classList.add('opaque');
  titleBG.textContent = 'Power Noodles';

  const nav = document.createElement('div');
  nav.classList.add('navBar');

  const fallout = document.createElement('img');
  fallout.src = falloutLogo;
  fallout.classList.add('titleImg');

  const menu = document.createElement('button');
  menu.classList.add('menu');
  menu.textContent = 'menu';

  nav.appendChild(fallout);
  nav.appendChild(menu);

  header.append(nav);
  header.append(titleBG);

  return header;
}

function createMap() {
  const map = document.createElement('img');
  map.src = locationImg;
  map.classList.add('map');
  map.classList.add('glow');

  return map;
}

function createHoursTable() {
  const element = document.createElement('table');

  const caption = document.createElement('caption');
  caption.textContent = 'OPENING HOURS';
  element.appendChild(caption);
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  for (let i = 0; i < 7; i += 1) {
    const day = document.createElement('tr');

    const label = document.createElement('th');
    label.innerText = days[i];

    const hours = document.createElement('td');
    hours.innerText = '8:00 a.m. - 10:00 p.m.';

    day.append(label);
    day.append(hours);
    element.append(day);
  }
  return element;
}

function createInformation() {
  const information = document.createElement('div');
  information.classList.add('information');
  information.classList.add('glow');

  const hoursTable = createHoursTable();

  information.append(hoursTable);

  return information;
}

export default function initialPage(element) {
  element.append(createHeader());
  element.append(createMap());
  element.append(createInformation());
}
