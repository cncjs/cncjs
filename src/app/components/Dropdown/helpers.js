/* eslint import/no-cycle: 0 */
import DropdownToggle from './DropdownToggle';
import DropdownMenu from './DropdownMenu';
import DropdownMenuWrapper from './DropdownMenuWrapper';
import MenuItem from './MenuItem';
import match from './match-component';

export const isDropdownToggle = match(DropdownToggle);
export const isDropdownMenu = match(DropdownMenu);
export const isDropdownMenuWrapper = match(DropdownMenuWrapper);
export const isMenuItem = match(MenuItem);
