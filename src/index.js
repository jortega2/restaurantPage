import { init } from 'es-module-lexer';
import { set } from 'internal-slot';
import initialPage from './initialpage';
import createFooter from './footer';
import createMenu from './menu';

const webPage = (() => {
  const content = document.querySelector('#content');
  let button;

  const clear = function () {
    content.innerText = '';
  };

  const setHomePage = function () {
    clear();
    initialPage(content);
    createFooter(content);
    buttonToggle(true);
  };

  const setMenuPage = function () {
    clear();
    createMenu(content);
    createFooter(content);
    buttonToggle(false);
  };

  const buttonToggle = function (fromHome) {
    button = document.querySelector('.navButton');
    if (fromHome) {
      button.addEventListener('click', setMenuPage);
    } else {
      button.addEventListener('click', setHomePage);
    }
  };

  // default
  setHomePage();

  button = document.querySelector('.navButton');
  button.addEventListener('click', setMenuPage);
})();
