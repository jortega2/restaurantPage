import './global.css';
import './menu.css';
import { data } from 'browserslist';
import menuItems from './menu.csv';
import falloutLogo from './imgs/fallout.png';

function addMenu(element) {
  // table caption
  const caption = document.createElement('caption');
  caption.innerText = 'Our Menu';

  element.appendChild(caption);
  // create rows of table
  for (let i = 0; i < menuItems.length; i += 1) {
    const row = document.createElement('tr');
    element.appendChild(row);
  }

  const { children } = element;

  // create header row
  for (let i = 0; i < menuItems[0].length; i += 1) {
    const tableHeader = document.createElement('th');
    tableHeader.innerText = menuItems[0][i];

    children[1].append(tableHeader);
  }

  // create data cells
  for (let i = 1; i < menuItems.length; i += 1) {
    for (let j = 0; j < menuItems[i].length; j += 1) {
      const dataCell = document.createElement('td');
      dataCell.innerText = menuItems[i][j];
      children[i + 1].append(dataCell);
    }
  }
}

function createBody() {
  const menuContainer = document.createElement('div');
  menuContainer.classList.add('menuContainer');
  menuContainer.classList.add('glow');

  const nav = document.createElement('div');
  nav.classList.add('navBar');

  const fallout = document.createElement('img');
  fallout.src = falloutLogo;
  fallout.classList.add('titleImg');

  const button = document.createElement('button');
  button.classList.add('navButton');
  button.textContent = 'Return to Home';

  const menu = document.createElement('table');
  menu.classList.add('menu');
  addMenu(menu);

  nav.appendChild(fallout);
  nav.appendChild(button);

  menuContainer.append(nav);
  menuContainer.append(menu);

  return menuContainer;
}

export default function createMenuPage(element) {
  element.appendChild(createBody());
}
