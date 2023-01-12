import gitHubIcon from './imgs/github.png';
import './global.css';

export default function createFooter(element) {
  const footer = document.createElement('footer');
  footer.classList.add('footer');
  footer.classList.add('glow');

  const icon = document.createElement('img');
  icon.src = gitHubIcon;

  const author = document.createElement('h2');
  author.innerText = 'jortega2';

  footer.append(icon);
  footer.append(author);

  element.appendChild(footer);
}
