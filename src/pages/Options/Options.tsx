import React, { useCallback, useEffect, useRef, useState } from 'react';
import './Options.css';
import {
  DragDropContext,
  Droppable,
  Draggable,
  OnDragEndResponder,
} from 'react-beautiful-dnd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faCheck,
  faRedoAlt,
  faWindowClose,
  faBars,
  faSpinner,
  faCompass,
} from '@fortawesome/free-solid-svg-icons';
import { TODOIST_TOKEN } from './OptionsSettings';
import OptionsList from './Options-list';
import OptionsCards from './Options-cards';

const Selector = () => {
  const [view, setView] = useState<'list' | 'cards' | null>(null);
  let renderedView = (
    <div
      className="task-list-actions"
      style={{ position: 'relative', marginBottom: '20px' }}
    >
      <button
        className="task-list-actions__item"
        onClick={() => setView('list')}
      >
        List View
      </button>
      <button
        className="task-list-actions__item"
        onClick={() => setView('cards')}
      >
        Cards View
      </button>
    </div>
  );
  if (view === 'list') {
    renderedView = <OptionsList title="Todoist Custom Sorter" />;
  } else if (view === 'cards') {
    renderedView = <OptionsCards />;
  }

  return renderedView;
};

export default Selector;
