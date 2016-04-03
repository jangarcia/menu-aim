import menuAim from '../src'

const element = document.querySelector('.menu-aim');
const options = {
  contentDirection: 'right',
  menuItemSelector: '.menu-aim__item',
  menuItemActiveClassName: 'menu-aim__item--active',
  delayingClassName: 'menu-aim--delaying'
};

menuAim(element, options);
