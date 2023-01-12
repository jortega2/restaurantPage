import { init } from 'es-module-lexer';
import initialPage from './initialpage';
import createFooter from './footer';

const content = document.querySelector('#content');

initialPage(content);
createFooter(content);
