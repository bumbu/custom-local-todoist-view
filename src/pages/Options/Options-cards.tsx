import React, { useEffect, useState } from 'react';
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
import './Options.css';

library.add(faCheck, faRedoAlt, faWindowClose, faBars, faSpinner, faCompass);

const FILTER =
  '(##Personal & (!assigned | assigned to: me) & !@waiting-for & no date & p3) | #Buckets';

type TodoistTaskRaw = {
  id: string;
  content: string;
  is_completed: boolean;
  priority: number;
};

type TodoistTask = TodoistTaskRaw & {
  // implicitOrder: number;
};

const Task = ({ task }: { task: TodoistTask }) => {
  return (
    <div className="task_list_item__body">
      <button className={'task_checkbox priority_' + task.priority}>
        <span className="task_checkbox__circle"></span>
        <svg width="24" height="24"></svg>
        <span className="task_checkbox__border"></span>
      </button>
      <div className="task_list_item__content">
        <span
          className="task_content"
          style={{
            textDecoration: task.is_completed ? 'line-through' : 'none',
          }}
        >
          {task.content}
        </span>
      </div>
      <span className="icon has-text-info bars-right">
        <FontAwesomeIcon icon="bars" style={{ color: '#ddd' }} />
      </span>
    </div>
  );
};

const OptionsCards: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<TodoistTask[]>([]);

  useEffect(() => {
    getTasks({ filter: FILTER }).then((tasks) => {
      setIsLoading(false);
      setTasks(tasks);
    });
  }, []);

  const relevantTasks = tasks.filter((task) => task.priority <= 3); // Only p3 and higher
  const nextTask = relevantTasks.length > 0 ? relevantTasks[0] : null;

  return (
    <div className="OptionsContainer">
      {isLoading && (
        <div className="task-list-loading-indicator">
          <FontAwesomeIcon
            icon="spinner"
            pulse
            size="2x"
            style={{ color: '#ddd' }}
          />
        </div>
      )}
      {!isLoading && nextTask !== null && (
        <>
          <div className="task_list_item">
            <Task task={nextTask} />
          </div>
          <div className="task_list_buttons">
            <button>I'll take it</button>
            <button>✅ Complete</button>
            <button>🗑️ Delete</button>
            <button>🚠 Select time horizon</button>
            <button>⤵️ I'll break it</button>
            <button>📍Defer it</button>
          </div>
        </>
      )}
      {!isLoading && nextTask === null && <p>No tasks found.</p>}
    </div>
  );
};

async function getTasks({
  filter,
}: {
  filter: string;
}): Promise<TodoistTask[]> {
  const params = new URLSearchParams({
    filter,
  });
  const response = await fetch(
    `https://api.todoist.com/rest/v2/tasks?${params}`,
    {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TODOIST_TOKEN}`,
      },
    }
  );

  const rawTasks: TodoistTaskRaw[] = await response.json();
  const normalizedTasks = normalizeTasks(rawTasks);
  const sortedAndNormalizedTasks = normalizedTasks
    .sort((a, b) => a.content.localeCompare(b.content))
    .filter((task) => task.priority <= 3); // Only p3 and higher

  return sortedAndNormalizedTasks;
}

function normalizeTasks(tasks: TodoistTaskRaw[]): TodoistTask[] {
  const normalizedTasks = tasks.map((task) => {
    // Task priority is stored as p1=4, p2=3, p3=2, p4=1
    // Instead return p1=1, p2=2, p3=3, p4=4
    const priority = 5 - Math.max(1, Math.min(4, task.priority));
    return { ...task, priority };
  });
  return normalizedTasks;
}

export default OptionsCards;
