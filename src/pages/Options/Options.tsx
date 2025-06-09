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
import { TODOIST_TOKEN } from './OptionsSettings'

library.add(faCheck, faRedoAlt, faWindowClose, faBars, faSpinner, faCompass);

// Work
// const FILTER =
// '((##Work & !p4) | #Work) & !@filter-out & !@waiting-for & !#Office & (no date | today | overdue)';
// Personal all
// const FILTER =
//   '##Personal & (!assigned | assigned to: me) & !@waiting-for & ((no date & p1) | (p1 | p2 | p3)) & (no date | today | overdue)';
// Personal only p3
const FILTER =
  '(##Personal & (!assigned | assigned to: me) & !@waiting-for & no date & p3) | #Buckets';
const MIN_TASK_ORDER = 10;
const MAX_TASK_ORDER = 99;

/**
 * TODO
 *
 * Ability to query multiple filters together
 * Ability to drop filters without numbers
 * Should my work filters just be 1 giant list?
 *
 * =Work:
 * Render project name
 * Render tags?
 *
 * =Personal:
 * Show all filter values
 * Send request by constructing new filter
 *
 * =General:
 * Move token and filter into settings
 */

const Task = ({ task, index }: { task: TodoistTask; index: number }) => {
  return (
    <div className="task_list_item__body">
      <button className={'task_checkbox priority_' + task.priority}>
        <span className="task_checkbox__circle"></span>
        <svg width="24" height="24">
          {/* <path
            fill="currentColor"
            d="M11.23 13.7l-2.15-2a.55.55 0 0 0-.74-.01l.03-.03a.46.46 0 0 0 0 .68L11.24 15l5.4-5.01a.45.45 0 0 0 0-.68l.02.03a.55.55 0 0 0-.73 0l-4.7 4.35z"
          ></path> */}
        </svg>
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

interface Props {
  title: string;
}

type TodoistTaskRaw = {
  id: string;
  content: string;
  is_completed: boolean;
  // description: string;
  priority: number;
};

type TodoistTask = TodoistTaskRaw & {
  // implicitOrder: number;
};

const Options: React.FC<Props> = ({ title }: Props) => {
  const [isLoading, setIsLoading] = useState(true);
  const tasksRef = useRef<TodoistTask[]>([]);
  const [tasks, setTasksImpl] = useState<TodoistTask[]>(tasksRef.current);
  // Before updating tasks, we want to keep it in a ref
  const setTasks = (tasks: TodoistTask[]): void => {
    tasksRef.current = tasks;
    setTasksImpl(tasks);
  };

  // Initial load
  useEffect(() => {
    console.log('start loading data');
    getTasks({ filter: FILTER }).then((tasks) => {
      setIsLoading(false);
      setTasks(tasks);

      // TODO commit normalization to cloud
      // scheduleTasksNormalization();
    });
  }, []);

  const onClickSpread = useCallback(async () => {
    setIsLoading(true);
    const newTasks = await spreadTasks(tasks);
    setTasks(newTasks);
    setIsLoading(false);
  }, [tasks]);

  const onDragEnd: OnDragEndResponder = (result) => {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    reorderTasks(
      tasks,
      result.source.index,
      result.destination.index,
      setIsLoading,
      setTasks
    );
  };

  const getItemStyle = (isDragging: boolean, draggableStyle) => ({
    // change background colour if dragging
    background: isDragging ? '#eee' : '#fff',
    // styles we need to apply on draggables
    ...draggableStyle,
  });

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

      {/* Super confusing, looked like a reload */}
      {/* {tasks.length > 0 && !isLoading && (
        <div className="task-list-actions">
          <button className="task-list-actions__item" onClick={onClickSpread}>
            <FontAwesomeIcon
              icon="compass"
              title="Spread tasks"
              size="2x"
              style={{ color: '#ddd' }}
            />
          </button>
        </div>
      )}
       */}
      {tasks.length > 0 && (
        <div className="task-list-title">
          <h2>{FILTER}</h2>
          {!isLoading && (
            <button className="task-list-title__action" onClick={onClickSpread}>
              Spread
            </button>
          )}
        </div>
      )}

      {isLoading && tasks.length === 0 && (
        <div className="task-list-loading-text">Loading...</div>
      )}
      <div>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="droppable">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="task-list-container"
              >
                {tasks.map((task, index) => (
                  <Draggable
                    key={`${index}_${task.id}`}
                    draggableId={`${index}_${task.id}`}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        className="task_list_item"
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={getItemStyle(
                          snapshot.isDragging,
                          provided.draggableProps.style
                        )}
                      >
                        <Task task={task} index={index} />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
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
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const rawTasks: TodoistTaskRaw[] = await response.json();
  const normalizedTasks = normalizeTasks(rawTasks);
  const sortedAndNormalizedTasks = normalizedTasks.sort((a, b) =>
    a.content.localeCompare(b.content)
  );

  return sortedAndNormalizedTasks;
}

async function spreadTasks(tasks: TodoistTask[]): Promise<TodoistTask[]> {
  let spread = Math.floor((MAX_TASK_ORDER - MIN_TASK_ORDER + 1) / tasks.length);
  if (spread > 10) {
    spread = 10;
  } else if (spread > 5) {
    spread = 5;
  }

  // Assign new number for each task
  let currentOrder = MIN_TASK_ORDER;
  const tasksToUpdate: TodoistTask[] = [];
  for (const task of tasks) {
    const oldImplicitOrder = getTaskOrder(task);
    const newImplicitOrder = currentOrder;
    if (oldImplicitOrder !== newImplicitOrder) {
      tasksToUpdate.push(task);
      updateTaskImplicitOrder(task, newImplicitOrder);
    }

    // Increment currentOrder for next iteration
    currentOrder += spread;
  }

  if (tasksToUpdate.length > 0) {
    await Promise.all(
      tasksToUpdate.map((task) => updateTask(task, { content: task.content }))
    );
  }

  // Return new array to trigger re-render
  return [...tasks];
}

async function updateTask(
  task: TodoistTask,
  fieldsToUpdate: {}
): Promise<TodoistTask> {
  const response = await fetch(
    `https://api.todoist.com/rest/v2/tasks/${task.id}`,
    {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TODOIST_TOKEN}`,
      },
      body: JSON.stringify(fieldsToUpdate),
    }
  );

  const newTask: TodoistTaskRaw = await response.json();
  return normalizeTasks([newTask])[0];
}

function scheduleTasksNormalization(): void {}

function normalizeTasks(tasks: TodoistTaskRaw[]): TodoistTask[] {
  const normalizedTasks = tasks.map((task) => {
    // Task priority is stored as p1=4, p2=3, p3=2, p4=1
    const priority = 5 - Math.max(1, Math.min(4, task.priority));
    // const implicitOrder = getTaskOrder(task) || -1;
    return { ...task, priority };
  });
  // For each task, extract its number
  // For tasks without numbers, add those
  // If all tasks are still in order, do nothing
  //   Otherwise redistribute
  return normalizedTasks;
}

// a little function to help us with reordering the result
async function reorderTasks(
  tasks: TodoistTask[],
  startIndex: number,
  endIndex: number,
  setIsLoading: (isLoading: boolean) => void,
  setTasks: (tasks: TodoistTask[]) => void
) {
  if (startIndex === endIndex) return;
  setIsLoading(true);
  console.log({ startIndex, endIndex });

  const isMovedUp = startIndex > endIndex;
  const currentTaskOrder = getTaskOrder(tasks[startIndex]);
  let newSiblingAboveIndex: null | number = null;
  let newSiblingBelowIndex: null | number = null;
  if (isMovedUp) {
    if (endIndex === 0) {
      // We took the first spot
      newSiblingAboveIndex = null;
      newSiblingBelowIndex = 0;
    } else {
      newSiblingAboveIndex = endIndex - 1;
      newSiblingBelowIndex = endIndex;
    }
  } else {
    if (endIndex === tasks.length - 1) {
      // We took the last spot
      newSiblingAboveIndex = tasks.length - 1;
      newSiblingBelowIndex = null;
    } else {
      newSiblingAboveIndex = endIndex;
      newSiblingBelowIndex = endIndex + 1;
    }
  }

  const newSiblingAboveOrder =
    newSiblingAboveIndex === null
      ? -Infinity
      : getTaskOrder(tasks[newSiblingAboveIndex]);
  const newSiblingBellowOrder =
    newSiblingBelowIndex === null
      ? Infinity
      : getTaskOrder(tasks[newSiblingBelowIndex]);
  console.log({
    currentTaskOrder,
    newSiblingAboveIndex,
    newSiblingBelowIndex,
    newSiblingAboveOrder,
    newSiblingBellowOrder,
  });

  if (newSiblingAboveOrder === null || newSiblingBellowOrder === null) {
    throw new Error(
      'Error in calculating sibling orders, probably missing orders'
    );
  }
  if (
    newSiblingAboveOrder === -Infinity &&
    newSiblingBellowOrder === Infinity
  ) {
    throw new Error(
      'Error in calculating sibling orders, or it is a single task'
    );
  }
  // Allow tasks to start from 0
  const minOrder = Math.max(0, newSiblingAboveOrder);
  const maxOrder = Math.min(MAX_TASK_ORDER, newSiblingBellowOrder);
  const newOrder = Math.floor((minOrder + maxOrder) / 2);

  // TODO check here is orders collide, and if they do, we need to update more items

  // Optimistic update
  const reorderedTasks = [...tasks];
  const [removed] = reorderedTasks.splice(startIndex, 1);
  updateTaskImplicitOrder(removed, newOrder);
  reorderedTasks.splice(endIndex, 0, removed);
  setTasks(reorderedTasks);

  // Update on server
  const updatedTask = await updateTask(removed, { content: removed.content });
  reorderedTasks[endIndex] = updatedTask;
  setTasks([...reorderedTasks]);
  setIsLoading(false);
}

function getTaskOrder(task: { content: string }): number | null {
  const match = task.content.match(/^\[([0-9]{1,2})\]/);
  if (match == null) {
    return null;
  } else {
    const index = match[1];
    const implicitOrder = parseInt(index, 10);
    // Check that the number is no more than 2 digits
    if (implicitOrder < 0 || implicitOrder > 99) {
      return null;
    } else {
      return implicitOrder;
    }
  }
}

function updateTaskImplicitOrder<T extends { content: string }>(
  task: T,
  newOrder: number
): T {
  const newOrderStr = newOrder.toString().padStart(2, '0');
  if (task.content.match(/^\[[0-9\-]{1,2}\]/) != null) {
    task.content = task.content.replace(
      /^\[[0-9\-]{1,2}\]/,
      `[${newOrderStr}]`
    );
  } else {
    task.content = `[${newOrderStr}] ${task.content}`;
  }

  return task;
}

export default Options;
