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

export default function initialPage(element) {
  element.append(createHeader());
  element.append(createMap());
}
