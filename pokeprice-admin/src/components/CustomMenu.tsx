import * as React from 'react';
import { createElement } from 'react';
import { useSelector } from 'react-redux';
import { useMediaQuery } from '@material-ui/core';
import { MenuItemLink, getResources } from 'react-admin';
import { withRouter } from 'react-router-dom';
import GetAppIcon from '@material-ui/icons/GetApp';


export const CustomMenu = (props:any) => {
  const isXSmall = useMediaQuery((theme:any) => theme.breakpoints.down('xs'));
  const open = useSelector((state:any) => state.admin.ui.sidebarOpen);
  const resources = useSelector(getResources);
  return (
    <div>
      {resources.map((resource:any) => (
        <MenuItemLink
          key={resource.name}
          to={`/${resource.name}`}
          primaryText={resource.options && resource.options.label || resource.name}
          leftIcon={createElement(resource.icon)}
          onClick={props.onMenuClick}
          sidebarIsOpen={open}
        />
      ))}
      <MenuItemLink
        to="/csv-links"
        primaryText="Csv"
        leftIcon={<GetAppIcon />}
        onClick={props.onMenuClick}
        sidebarIsOpen={open}
      />
      {isXSmall && props.logout}
    </div>
  );
}