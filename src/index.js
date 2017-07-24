// Compute the two `x` and two `y` coordinates of the given `element`.
const computeCoordinates = (element) => {
  const rect = element.getBoundingClientRect();
  const top = rect.top + (window.pageYOffset || document.documentElement.scrollTop);
  const left = rect.left + (window.pageXOffset || document.documentElement.scrollLeft);
  const computedStyles = window.getComputedStyle(element);
  return {
    top,
    right: left + element.clientWidth - parseInt(computedStyles.getPropertyValue('padding-left')) - parseInt(computedStyles.getPropertyValue('padding-right')),
    bottom: top + element.clientHeight - parseInt(computedStyles.getPropertyValue('padding-top')) - parseInt(computedStyles.getPropertyValue('padding-bottom')),
    left
  };
};

// Compute the gradient of a line drawn from `pointA` to `pointB`.
const computeGradient = (pointA, pointB) => {
  return (pointB.y - pointA.y) / (pointB.x - pointA.x);
};

// Record the last 2 mouse coordinates.
let previousCoordinates = null;
let currentCoordinates = null;
const saveMouseCoordinates = (event) => {
  previousCoordinates = currentCoordinates;
  currentCoordinates = {
    x: event.pageX,
    y: event.pageY
  };
};
window.addEventListener('mousemove', saveMouseCoordinates);

export default (menuElement, options) => {

  const contentDirection = options.contentDirection || 'right';
  const delay = options.delay || 200;
  const menuItemSelector = options.menuItemSelector || '.menu-aim__item';
  const menuItemActiveClassName = options.menuItemActiveClassName || 'menu-aim__item--active';
  const delayingClassName = options.delayingClassName || 'menu-aim--delaying';
  const threshold = options.threshold || 50;
  const activateCallback = options.activateCallback || null;
  const deactivateCallback = options.deactivateCallback || null;
  const mouseEnterCallback = options.mouseEnterCallback || null;
  const mouseLeaveCallback = options.mouseLeaveCallback || null;

  // Compute the pixel coordinates of the four corners of the block taken up
  // by the items that match the `menuItemSelector`.
  const {top, right, bottom, left} = computeCoordinates(menuElement);
  const topLeftCorner = { y: top - threshold, x: left - threshold };
  const topRightCorner = { y: top - threshold, x: right + threshold };
  const bottomLeftCorner = { y: bottom + threshold, x: left - threshold };
  const bottomRightCorner = { y: bottom + threshold, x: right + threshold };

  // Our expectations for decreasing or increasing gradients depends on
  // the direction that the menu content shows relative to the menu items.
  // For example, if the content is on the right, expect the slope between
  // the mouse coordinate and the top-right corner to decrease over time.
  let decreasingCorner;
  let increasingCorner;
  switch (contentDirection) {
    case 'top':
      decreasingCorner = topLeftCorner;
      increasingCorner = topRightCorner;
      break;
    case 'bottom':
      decreasingCorner = bottomRightCorner;
      increasingCorner = bottomLeftCorner;
      break;
    case 'left':
      decreasingCorner = bottomLeftCorner;
      increasingCorner = topLeftCorner;
      break;
    default: // 'right'
      decreasingCorner = topRightCorner;
      increasingCorner = bottomRightCorner;
      break;
  }

  let activeMenuItem = null;

  // If there is an `activeMenuItem`, deactivate it.
  const deactivateActiveMenuItem = () => {
    if (activeMenuItem) {
      activeMenuItem.classList.remove(menuItemActiveClassName);
      if(deactivateCallback) deactivateCallback(activeMenuItem);
      activeMenuItem = null;
    }
  };

  // Set `activeMenuItem` to the given `menuItem`, and activate
  // it immediately.
  const activateMenuItem = (menuItem) => {
    if (menuItem === activeMenuItem) {
      // Exit if the `menuItem` we want to activate is already
      // the current `activeMenuItem`.
      return;
    }
    deactivateActiveMenuItem();
    // Activate the given `menuItem`.
    activeMenuItem = menuItem;
    menuItem.classList.add(menuItemActiveClassName);
    if(activateCallback) activateCallback(menuItem);
  };

  let lastCheckedCoordinates = null;

  // Returns `true` if the `activeMenuItem` should be set to a new menu
  // item, else returns `false`.
  const shouldChangeActiveMenuItem = () => {

    if (

      // If there isn't an `activeMenuItem`, activate the new menu item
      // immediately.
      !activeMenuItem ||

      // If either `currentCoordinates` or `previousCoordinates` are still
      // their initial values, activate the new menu item immediately.
      !currentCoordinates || !previousCoordinates ||

      // If the mouse was previously outside the menu's bounds, activate the
      // new menu item immediately.
      previousCoordinates.x < left ||
      previousCoordinates.x > right ||
      previousCoordinates.y < top ||
      previousCoordinates.y > bottom ||

      // If the mouse hasn't moved since the last time we checked, activate the
      // new menu item immediately.
      (lastCheckedCoordinates &&
       currentCoordinates.x === lastCheckedCoordinates.x &&
       currentCoordinates.y === lastCheckedCoordinates.y) ||

      // Our expectations for decreasing or increasing gradients depends on
      // the direction that the content shows relative to the menu items. For
      // example, if the content is on the right, expect the slope between
      // the mouse coordinate and the upper right corner to decrease over
      // time. If either of the below two conditions are true, the mouse was
      // not moving towards the content of `activeMenuItem`, so we activate
      // the new menu item immediately.
      computeGradient(currentCoordinates, decreasingCorner) >
        computeGradient(previousCoordinates, decreasingCorner) ||
      computeGradient(currentCoordinates, increasingCorner) <
        computeGradient(previousCoordinates, increasingCorner)

    ) {
      lastCheckedCoordinates = null;
      menuElement.classList.remove(delayingClassName);
      return true;
    }

    // The mouse moved from `previousCoordinates` towards the content of
    // the `activeMenuItem`, so we should wait before attempting to activate
    // the new menu item again.
    lastCheckedCoordinates = currentCoordinates;
    menuElement.classList.add(delayingClassName);
    return false;
  };

  let timeoutId = null;

  // Cancel pending menu item activations.
  const cancelPendingMenuItemActivations = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };

  // Check if we should activate the given `menuItem`. If we find that the
  // mouse is moving towards the content of the `activeMenuItem`, attempt to
  // activate the `menuItem` again after a short `delay`.
  const possiblyActivateMenuItem = (menuItem) => {
    cancelPendingMenuItemActivations();
    if (shouldChangeActiveMenuItem()) {
      return activateMenuItem(menuItem);
    }
    timeoutId = setTimeout(() => {
      possiblyActivateMenuItem(menuItem);
    }, delay);
  };

  // Immediately activate the menu item that was clicked.
  const handleMenuItemClick = (event) => {
    cancelPendingMenuItemActivations();
    activateMenuItem(event.target);
  };

  // Attempt to activate the menu item that the mouse is currently
  // mousing over.
  const handleMenuItemMouseEnter = (event) => {
    const isMouseEnter = activeMenuItem === null;
    possiblyActivateMenuItem(event.target);
    if (isMouseEnter) {
        if(mouseEnterCallback) mouseEnterCallback(activeMenuItem);
    }
  };

  // Attempt to deactivate the `activeMenuItem` if we have left the menu
  // `menuElement` entirely.
  const handleMouseLeave = () => {
    if (shouldChangeActiveMenuItem()) {
      cancelPendingMenuItemActivations();
      if(mouseLeaveCallback) mouseLeaveCallback(activeMenuItem);
      deactivateActiveMenuItem();
    }
  };

  const handleClickOutsideMenu = (event) => {
    let targetElement = event.target;
    // Keep walking up the DOM tree and check that we'd actually clicked
    // outside the menu. Exit the loop if and only if we'd encountered
    // `menuElement` or we'd reached the root of the tree.
    while (targetElement && targetElement !== menuElement) {
      targetElement = targetElement.parentNode;
    }
    if (!targetElement) {
      deactivateActiveMenuItem();
    }
  };

  // Bind the required event listeners.
  const menuItems = [].slice.call(menuElement.querySelectorAll(menuItemSelector));
  menuItems.forEach((menuItem) => {
    menuItem.addEventListener('click', handleMenuItemClick);
    menuItem.addEventListener('mouseenter', handleMenuItemMouseEnter);
  });
  menuElement.addEventListener('mouseleave', handleMouseLeave);
  window.addEventListener('click', handleClickOutsideMenu);

  // Return a function for unbinding all event listeners.
  return () => {
    menuItems.forEach((menuItem) => {
      menuItem.removeEventListener('click', handleMenuItemClick);
      menuItem.removeEventListener('mouseenter', handleMenuItemMouseEnter);
    });
    menuElement.removeEventListener('mouseleave', handleMouseLeave);
    window.removeEventListener('click', handleClickOutsideMenu);
  };

}
