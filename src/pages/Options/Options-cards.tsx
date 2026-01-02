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

const QUESTIONS = {
  is_it_completed: 'Is it completed?',
  action_on_it: 'Action on it now?',
  should_delete: 'Should it be deleted?',
  confirm_time_horizon: 'Confirm time horizon',
  break_it: 'Break it down?',
  defer_it: 'Defer it',
};

const QUESTION_KEYS = Object.keys(QUESTIONS) as (keyof typeof QUESTIONS)[];

const OptionsCards: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<TodoistTask[]>([]);
  const [question, setQuestion] =
    useState<keyof typeof QUESTIONS>('is_it_completed');

  useEffect(() => {
    getTasks({ filter: FILTER }).then((tasks) => {
      setIsLoading(false);
      setTasks(tasks);
    });
  }, []);

  const relevantTasks = tasks.filter((task) => task.priority <= 3); // Only p3 and higher
  const horizons = tasks
    .filter((task) => task.priority === 4)
    .sort((a, b) => {
      const aNum = extractNumber(a.content) || 0;
      const bNum = extractNumber(b.content) || 0;
      return aNum - bNum;
    });
  const nextTask = relevantTasks.length > 0 ? relevantTasks[0] : null;

  const handleNextQuestion = () => {
    const currentIndex = QUESTION_KEYS.indexOf(question);
    const nextIndex = (currentIndex + 1) % QUESTION_KEYS.length;
    setQuestion(QUESTION_KEYS[nextIndex]);
  };

  const handleHorizonClick = async (horizonIndex: number) => {
    if (!nextTask) return;

    const selectedHorizon = horizons[horizonIndex];
    const nextHorizon = horizons[horizonIndex + 1];

    const horizonStart = extractNumber(selectedHorizon.content) || 0;
    const horizonEnd = nextHorizon
      ? (extractNumber(nextHorizon.content) || 100) - 1
      : 99;

    const taskNum = extractNumber(nextTask.content);

    if (taskNum !== null && taskNum >= horizonStart && taskNum <= horizonEnd) {
      handleNextQuestion();
    } else {
      setIsLoading(true);
      try {
        const newTitle = nextTask.content.replace(
          /^\[\d+\]/,
          `[${horizonEnd.toString().padStart(2, '0')}]`
        );
        // If no [XX] prefix, add it
        const finalTitle = /^\[\d+\]/.test(nextTask.content)
          ? newTitle
          : `[${horizonEnd.toString().padStart(2, '0')}] ${nextTask.content}`;

        await updateTaskTitle(nextTask.id, finalTitle);
        const updatedTasks = await getTasks({ filter: FILTER });
        setTasks(updatedTasks);
      } catch (error) {
        alert('Failed to update task title');
      } finally {
        setIsLoading(false);
        handleNextQuestion();
      }
    }
  };

  const handleComplete = async () => {
    if (!nextTask) return;
    setIsLoading(true);
    try {
      await completeTask(nextTask.id);
      const updatedTasks = await getTasks({ filter: FILTER });
      setTasks(updatedTasks);
    } catch (error) {
      alert('Failed to complete task');
    } finally {
      setIsLoading(false);
      setQuestion('is_it_completed');
    }
  };

  const handleDelete = async () => {
    if (!nextTask) return;
    setIsLoading(true);
    try {
      await deleteTask(nextTask.id);
      const updatedTasks = await getTasks({ filter: FILTER });
      setTasks(updatedTasks);
    } catch (error) {
      alert('Failed to delete task');
    } finally {
      setIsLoading(false);
      setQuestion('is_it_completed');
    }
  };

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
            <p className="task_list_buttons__question">{QUESTIONS[question]}</p>
            <button onClick={handleNextQuestion}>no</button>
            {question === 'is_it_completed' && (
              <button onClick={handleComplete}>✅ Yes, close it</button>
            )}
            {question === 'action_on_it' && (
              <button onClick={handleComplete}>✅ Task completed</button>
            )}
            {question === 'should_delete' && (
              <button onClick={handleDelete}>🗑️ Delete it</button>
            )}
            {question === 'confirm_time_horizon' && (
              <div className="time_horizons">
                {horizons.map((horizon, index) => (
                  <button
                    key={horizon.id}
                    onClick={() => handleHorizonClick(index)}
                  >
                    {horizon.content}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      {!isLoading && nextTask === null && <p>No tasks found.</p>}
    </div>
  );
};

async function completeTask(taskId: string): Promise<void> {
  const response = await fetch(
    `https://api.todoist.com/rest/v2/tasks/${taskId}/close`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TODOIST_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to complete task');
  }
}

async function deleteTask(taskId: string): Promise<void> {
  const response = await fetch(
    `https://api.todoist.com/rest/v2/tasks/${taskId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${TODOIST_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to delete task');
  }
}

async function updateTaskTitle(taskId: string, title: string): Promise<void> {
  const response = await fetch(
    `https://api.todoist.com/rest/v2/tasks/${taskId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TODOIST_TOKEN}`,
      },
      body: JSON.stringify({ content: title }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update task title');
  }
}

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
  const sortedAndNormalizedTasks = normalizedTasks.sort((a, b) =>
    a.content.localeCompare(b.content)
  );

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

function extractNumber(content: string): number | null {
  const match = content.match(/^\[(\d+)\]/);
  return match ? parseInt(match[1], 10) : null;
}

export default OptionsCards;
