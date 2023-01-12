import { init } from 'es-module-lexer';
import initialPage from './initialpage';
import createFooter from './footer';
import createMenu from './menu';

const content = document.querySelector('#content');

createMenu(content);
createFooter(content);
