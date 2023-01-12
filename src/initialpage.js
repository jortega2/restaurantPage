import './initialPage.css';
import './global.css';
import falloutLogo from './imgs/fallout.png';
import locationImg from './imgs/diamondcity.jpg';
import about from './about.txt';

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

  const button = document.createElement('button');
  button.classList.add('navButton');
  button.textContent = 'View the Menu';

  nav.appendChild(fallout);
  nav.appendChild(button);

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

function createHours() {
  const storeHours = document.createElement('div');
  storeHours.classList.add('storeHours');
  storeHours.classList.add('glow');

  const hoursTable = createHoursTable();

  storeHours.append(hoursTable);

  return storeHours;
}

function createInformation() {
  const information = document.createElement('div');
  information.classList.add('information');
  information.classList.add('glow');

  const title = document.createElement('h2');
  title.innerText = 'From the Wiki';

  const info = document.createElement('p');
  info.innerText = about;

  information.append(title);
  information.append(info);

  return information;
}

function createCredits() {
  const credits = document.createElement('div');
  credits.classList.add('glow');
  credits.classList.add('credits');

  const title = document.createElement('h2');
  title.innerText = 'Credits';

  const restaurantImage = document.createElement('a');
  restaurantImage.href = 'https://fallout.fandom.com/wiki/Power_Noodles?file=FO4_P_Noodles_TV.png';
  restaurantImage.innerText = 'Kdarrow for the main Power Noodles screenshot.';

  const logo = document.createElement('a');
  logo.href = 'https://www.pngfind.com/mpng/ohxJRi_allout-fallout-2-fallout-shelter-fallout-4-fallout/';
  logo.innerText = 'pngfind for the Fallout logo';

  const location = document.createElement('a');
  location.href = 'https://fallout-archive.fandom.com/wiki/Diamond_City_market';
  location.innerText = 'Fallout 4 fandom page for the location image used on the home page';

  const wikiInfo = document.createElement('a');
  wikiInfo.href = 'https://fallout.fandom.com/wiki/Power_Noodles';
  wikiInfo.innerText = 'Fallout 4 fandom page for their notes that were used in the information section';

  const consumables = document.createElement('a');
  consumables.href = 'https://fallout.fandom.com/wiki/Fallout_4_consumables';
  consumables.innerText = 'Fallout 4 fandom page for the food information used in the menu page';

  const bethesda = document.createElement('a');
  bethesda.href = 'https://fallout.bethesda.net/en/games/fallout-4';
  bethesda.innerText = 'Bethesda for creating Fallout 4';

  credits.appendChild(title);
  credits.appendChild(bethesda);
  credits.appendChild(restaurantImage);
  credits.appendChild(location);
  credits.appendChild(wikiInfo);
  credits.appendChild(consumables);
  credits.appendChild(logo);

  return credits;
}

export default function initialPage(element) {
  element.append(createHeader());
  element.append(createMap());
  element.append(createHours());
  element.append(createInformation());
  element.append(createCredits());
}
