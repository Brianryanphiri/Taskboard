import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

// --- ENHANCED INTERFACES ---

type TaskPriority = 'Low' | 'Medium' | 'High';
type TaskStatus = 'To Do' | 'In Progress' | 'Review' | 'Done';
type ProjectStatus = 'Active' | 'On Hold' | 'Archived';

interface Task {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  assignees: string[];
  completed: boolean;
  priority: TaskPriority;
  status: TaskStatus;
  projectId: number;
}

interface Project {
  id: number;
  title: string;
  description: string;
  tasks: Task[];
  availableAssignees: string[];
  status: ProjectStatus;
}

// --- UTILITY COMPONENTS (for a cleaner main component) ---

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center pb-3">
                    <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none font-semibold">
                        &times;
                    </button>
                </div>
                <div className="mt-2 text-gray-600">
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- HELPER FUNCTIONS ---

const getPriorityColor = (priority: TaskPriority) => {
  switch (priority) {
    case 'High': return 'bg-red-500 text-white';
    case 'Medium': return 'bg-yellow-500 text-gray-800';
    case 'Low': return 'bg-green-500 text-white';
    default: return 'bg-gray-200';
  }
};

const getStatusColor = (status: TaskStatus) => {
    switch (status) {
        case 'To Do': return 'bg-gray-200 text-gray-800';
        case 'In Progress': return 'bg-blue-200 text-blue-800';
        case 'Review': return 'bg-purple-200 text-purple-800';
        case 'Done': return 'bg-green-200 text-green-800';
        default: return 'bg-gray-100';
    }
}

// --- MAIN COMPONENT ---

const ProjectManagementTool: React.FC = () => {
  // --- STATE ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  
  // Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('Medium');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  
  // Modal/View State
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');


  // --- SIDE EFFECTS (Local Storage Persistence) ---
  useEffect(() => {
    // Load projects from local storage
    const storedProjects = localStorage.getItem('pm_tool_projects');
    if (storedProjects) {
      setProjects(JSON.parse(storedProjects));
    }
  }, []);

  useEffect(() => {
    // Save projects to local storage whenever they change
    localStorage.setItem('pm_tool_projects', JSON.stringify(projects));
  }, [projects]);


  // --- HANDLERS ---

  const handleAddProject = () => {
    if (!newProjectTitle.trim()) return;
    const newProject: Project = {
      id: projects.length > 0 ? Math.max(...projects.map(p => p.id)) + 1 : 1,
      title: newProjectTitle,
      description: 'A new project for the team.',
      tasks: [],
      availableAssignees: [],
      status: 'Active',
    };
    setProjects([...projects, newProject]);
    setNewProjectTitle('');
  };

  const handleAddAssignee = () => {
    if (selectedProject && newAssignee.trim()) {
      const updatedProjects = projects.map(p => 
        p.id === selectedProject.id 
          ? { ...p, availableAssignees: [...p.availableAssignees, newAssignee] }
          : p
      );
      setProjects(updatedProjects);
      setSelectedProject(prev => prev ? updatedProjects.find(up => up.id === prev.id) || null : null);
      setNewAssignee('');
    }
  };

  const handleAddTask = () => {
    if (selectedProject && newTaskTitle.trim()) {
      const newTask: Task = {
        id: selectedProject.tasks.length > 0 ? Math.max(...selectedProject.tasks.map(t => t.id)) + 1 : 1,
        projectId: selectedProject.id,
        title: newTaskTitle,
        description: newTaskDescription,
        dueDate: newTaskDueDate,
        assignees: selectedAssignee ? [selectedAssignee] : [],
        completed: false,
        priority: newTaskPriority,
        status: 'To Do',
      };
      
      const updatedProjects = projects.map(p => 
        p.id === selectedProject.id 
          ? { ...p, tasks: [...p.tasks, newTask] }
          : p
      );
      setProjects(updatedProjects);
      
      // Reset form and close modal
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDueDate('');
      setNewTaskPriority('Medium');
      setSelectedAssignee('');
      setIsTaskModalOpen(false);
    }
  };

  const handleUpdateTaskStatus = useCallback((taskId: number, newStatus: TaskStatus) => {
    if (!selectedProject) return;

    const updatedProjects = projects.map(p => {
      if (p.id === selectedProject.id) {
        const updatedTasks = p.tasks.map(t => 
          t.id === taskId 
            ? { ...t, status: newStatus, completed: newStatus === 'Done' } 
            : t
        );
        return { ...p, tasks: updatedTasks };
      }
      return p;
    });

    setProjects(updatedProjects);
    setSelectedProject(prev => prev ? updatedProjects.find(up => up.id === prev.id) || null : null);
  }, [projects, selectedProject]);

  const handleDeleteTask = (task: Task) => {
    if (selectedProject) {
      const updatedProjects = projects.map(p => {
        if (p.id === selectedProject.id) {
          return { ...p, tasks: p.tasks.filter(t => t.id !== task.id) };
        }
        return p;
      });
      setProjects(updatedProjects);
      setSelectedProject(prev => prev ? updatedProjects.find(up => up.id === prev.id) || null : null);
    }
  };

  // --- MEMOIZED DATA FOR CHARTS/KANBAN ---

  const chartData = useMemo(() => projects.map(project => ({
    name: project.title,
    'Total Tasks': project.tasks.length,
    'Completed Tasks': project.tasks.filter(t => t.completed).length,
    'Open Tasks': project.tasks.filter(t => !t.completed).length,
  })), [projects]);

  const assigneeWorkloadData = useMemo(() => {
    const workload: { [key: string]: number } = {};
    projects.forEach(p => {
      p.tasks.forEach(t => {
        t.assignees.forEach(a => {
          workload[a] = (workload[a] || 0) + 1;
        });
      });
    });
    return Object.entries(workload).map(([name, tasks]) => ({ name, tasks }));
  }, [projects]);

  const kanbanTasks = useMemo(() => {
    if (!selectedProject) return {};
    const taskMap: { [key in TaskStatus]?: Task[] } = {
        'To Do': [],
        'In Progress': [],
        'Review': [],
        'Done': [],
    };
    selectedProject.tasks.forEach(task => {
        taskMap[task.status] = [...(taskMap[task.status] || []), task];
    });
    return taskMap;
  }, [selectedProject]);

  const statusColumns: TaskStatus[] = ['To Do', 'In Progress', 'Review', 'Done'];


  // --- RENDER HELPERS (Task/Kanban Cards) ---

  const TaskCard: React.FC<{ task: Task }> = ({ task }) => (
    <div className="bg-white p-3 border-l-4 border-blue-500 shadow-md rounded-md mb-2">
      <h4 className="font-semibold text-lg truncate">{task.title}</h4>
      <p className="text-sm text-gray-500 mb-2 truncate">{task.description}</p>
      
      <div className="flex justify-between items-center text-xs">
          <span className={`px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
              {task.priority} Priority
          </span>
          <span className="text-gray-600">
              Due: {task.dueDate}
          </span>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
          {task.assignees.map(a => (
              <span key={a} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                  {a}
              </span>
          ))}
      </div>
      <div className="mt-2 flex justify-end space-x-2">
          <button 
              onClick={() => handleDeleteTask(task)}
              className="text-red-500 hover:text-red-700 text-sm"
          >
              Delete
          </button>
      </div>
    </div>
  );

  const KanbanColumn: React.FC<{ status: TaskStatus, tasks: Task[] }> = ({ status, tasks }) => (
    <div className="flex-1 min-w-[250px] bg-gray-100 rounded-lg p-3 shadow-inner">
      <h3 className={`text-lg font-bold mb-3 p-1 rounded ${getStatusColor(status)} text-center`}>
        {status} ({tasks.length})
      </h3>
      
      {tasks.map((task) => (
        <div key={task.id} className="mb-3">
            <TaskCard task={task} />
            
            {/* Simple status update selector for demonstration */}
            <select
                value={task.status}
                onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as TaskStatus)}
                className="w-full text-xs p-1 border rounded mt-1 bg-white"
            >
                {statusColumns.map(s => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </select>
        </div>
      ))}
    </div>
  );

  // --- RENDER ---

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-extrabold mb-6 text-center text-gray-800">Project Management Dashboard 🚀</h1>
      
      {/* Project Creation & Selector */}
      <div className="bg-white p-6 rounded-lg shadow-xl mb-8 border-t-4 border-blue-600">
        <h2 className="text-2xl font-bold mb-4 text-gray-700">Manage Projects</h2>
        
        <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
          <input
            type="text"
            value={newProjectTitle}
            onChange={(e) => setNewProjectTitle(e.target.value)}
            placeholder="Enter New Project Title"
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleAddProject}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
          >
            Create Project
          </button>
        </div>

        <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Active Project:</label>
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const project = projects.find(p => p.id === parseInt(e.target.value));
                setSelectedProject(project || null);
                setViewMode('kanban'); // Default to kanban on selection
              }}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">-- Select Project --</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title} ({project.tasks.length} tasks)
                </option>
              ))}
            </select>
        </div>
      </div>
      
      {/* Project Detail View (Conditional) */}
      {selectedProject && (
        <div className="bg-white p-6 rounded-lg shadow-xl mb-8 border-t-4 border-purple-600">
          <h2 className="text-3xl font-extrabold mb-4 text-purple-700">{selectedProject.title}</h2>
          
          {/* Action Bar */}
          <div className="flex flex-wrap gap-4 mb-4 border-b pb-4">
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center"
            >
              + Add New Task
            </button>
            <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                <button
                    onClick={() => setViewMode('kanban')}
                    className={`py-2 px-4 rounded-lg transition ${viewMode === 'kanban' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-200'}`}
                >
                    Kanban Board
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={`py-2 px-4 rounded-lg transition ${viewMode === 'list' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-200'}`}
                >
                    List View
                </button>
            </div>
            {/* Assignee Input */}
            <div className="flex space-x-2 ml-auto">
                <input
                    type="text"
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    placeholder="New Assignee"
                    className="p-2 border rounded-lg w-32"
                />
                <button
                    onClick={handleAddAssignee}
                    className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg"
                >
                    Add Team Member
                </button>
            </div>
          </div>
          
          {/* Kanban Board View */}
          {viewMode === 'kanban' && (
            <div className="flex overflow-x-auto space-x-4 pb-4">
              {statusColumns.map((status) => (
                <KanbanColumn 
                    key={status} 
                    status={status} 
                    tasks={kanbanTasks[status] || []} 
                />
              ))}
            </div>
          )}

          {/* Simple List View (Fallback/Detail) */}
          {viewMode === 'list' && (
            <div className="divide-y divide-gray-200">
              {selectedProject.tasks.length === 0 ? (
                <p className="py-4 text-center text-gray-500">No tasks in this project. Start by adding one!</p>
              ) : (
                selectedProject.tasks.map((task) => (
                  <div key={task.id} className="flex justify-between items-center py-3">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`text-lg font-medium ${
                          task.completed ? 'text-gray-400 line-through' : 'text-gray-700'
                        }`}
                      >
                        {task.title}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                        <button
                          onClick={() => handleUpdateTaskStatus(task.id, 'Done')}
                          disabled={task.completed}
                          className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-medium py-1 px-3 rounded text-sm"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task)}
                          className="bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-3 rounded text-sm"
                        >
                          Delete
                        </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      )}

      {/* Analytics Section */}
      <div className="bg-white p-6 rounded-lg shadow-xl border-t-4 border-teal-600">
          <h2 className="text-2xl font-bold mb-4 text-teal-700">Project Analytics</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Task Progress Line Chart */}
              <div>
                  <h3 className="text-xl font-semibold mb-2">Project Task Progress</h3>
                  <LineChart width={550} height={300} data={chartData} className="mx-auto">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="name" angle={-15} textAnchor="end" height={50} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Total Tasks" stroke="#8884d8" strokeWidth={2} />
                      <Line type="monotone" dataKey="Completed Tasks" stroke="#4caf50" strokeWidth={2} />
                      <Line type="monotone" dataKey="Open Tasks" stroke="#ffc658" strokeWidth={2} />
                  </LineChart>
              </div>
              
              {/* Assignee Workload Pie Chart */}
              <div>
                  <h3 className="text-xl font-semibold mb-2">Assignee Workload (Total Tasks)</h3>
                  {assigneeWorkloadData.length > 0 ? (
                      <PieChart width={550} height={300} className="mx-auto">
                          <Pie
                              data={assigneeWorkloadData}
                              dataKey="tasks"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              fill="#82ca9d"
                              label
                          >
                            {/* Color Palette for Pie Chart Cells */}
                            {assigneeWorkloadData.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28FDF'][index % 5]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                      </PieChart>
                  ) : (
                      <p className="text-center text-gray-500 mt-10">Add tasks and assignees to see workload.</p>
                  )}
              </div>
          </div>
      </div>
      
      {/* Add Task Modal */}
      <Modal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        title={`Add New Task to ${selectedProject?.title}`}
      >
        <div className="flex flex-col space-y-4">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Task Title"
            className="p-3 border border-gray-300 rounded-lg"
          />
          <textarea
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            placeholder="Task Description"
            rows={3}
            className="p-3 border border-gray-300 rounded-lg"
          />
          <div className="flex space-x-4">
            <input
              type="date"
              value={newTaskDueDate}
              onChange={(e) => setNewTaskDueDate(e.target.value)}
              placeholder="Due Date"
              className="flex-1 p-3 border border-gray-300 rounded-lg"
            />
            <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                className="flex-1 p-3 border border-gray-300 rounded-lg bg-white"
            >
                <option value="High">Priority: High</option>
                <option value="Medium">Priority: Medium</option>
                <option value="Low">Priority: Low</option>
            </select>
          </div>
          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="p-3 border border-gray-300 rounded-lg bg-white"
          >
            <option value="">Select Assignee</option>
            {selectedProject?.availableAssignees.map((assignee) => (
              <option key={assignee} value={assignee}>
                {assignee}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddTask}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg mt-2"
          >
            Create Task
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectManagementTool;