import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  Plus, Users, LayoutList, ListTodo, ClipboardList, TrendingUp, BarChart3, Clock, CheckCircle
} from "lucide-react";

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

// --- UTILITY COMPONENTS (with modern styling) ---

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 transform transition-all">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
                    <h3 className="text-2xl font-semibold text-gray-900">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
                        <Plus className="w-6 h-6 rotate-45" />
                    </button>
                </div>
                {children}
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
        case 'To Do': return 'bg-gray-100 text-gray-700 border-gray-300';
        case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-300';
        case 'Review': return 'bg-purple-100 text-purple-700 border-purple-300';
        case 'Done': return 'bg-green-100 text-green-700 border-green-300';
        default: return 'bg-gray-100';
    }
}

// --- MAIN COMPONENT ---

const Taskboard: React.FC = () => {
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
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban'); // Default to Kanban


  // --- SIDE EFFECTS (Local Storage Persistence) ---
  useEffect(() => {
    const storedProjects = localStorage.getItem('pm_tool_projects');
    if (storedProjects) {
      const loadedProjects: Project[] = JSON.parse(storedProjects);
      setProjects(loadedProjects);
      // Select the first project or maintain the selection if possible
      if (loadedProjects.length > 0) {
        setSelectedProject(loadedProjects[0]);
      }
    }
  }, []);

  useEffect(() => {
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
    const newProjectList = [...projects, newProject];
    setProjects(newProjectList);
    setNewProjectTitle('');
    setSelectedProject(newProject); // Auto-select the new project
  };

  const handleAddAssignee = () => {
    if (selectedProject && newAssignee.trim()) {
      const updatedProjects = projects.map(p => 
        p.id === selectedProject.id 
          ? { ...p, availableAssignees: Array.from(new Set([...p.availableAssignees, newAssignee.trim()])) }
          : p
      );
      setProjects(updatedProjects);
      setSelectedProject(prev => prev ? updatedProjects.find(up => up.id === prev.id) || null : null);
      setNewAssignee('');
    }
  };

  const handleAddTask = () => {
    if (selectedProject && newTaskTitle.trim() && selectedAssignee) {
      const newTask: Task = {
        id: selectedProject.tasks.length > 0 ? Math.max(...selectedProject.tasks.map(t => t.id)) + 1 : 1,
        projectId: selectedProject.id,
        title: newTaskTitle,
        description: newTaskDescription,
        dueDate: newTaskDueDate,
        assignees: [selectedAssignee], // Simplified to one assignee from the form
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
    // Keep selectedProject reference updated
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
    <div className="bg-white p-4 rounded-lg shadow-md border-t-4 border-blue-500/50 hover:shadow-lg transition mb-3">
      <div className="flex justify-between items-start">
        <h4 className="font-semibold text-base truncate text-gray-800">{task.title}</h4>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
            {task.priority}
        </span>
      </div>
      <p className="text-sm text-gray-500 my-1 line-clamp-2">{task.description}</p>
      
      <div className="flex flex-wrap gap-1 mt-2 border-t border-gray-100 pt-2">
          {task.assignees.map(a => (
              <span key={a} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                  {a}
              </span>
          ))}
      </div>
      <div className="mt-2 flex justify-between items-center text-xs text-gray-600">
          <span>Due: {task.dueDate}</span>
          <button 
              onClick={() => handleDeleteTask(task)}
              className="text-red-500 hover:text-red-700 font-medium transition"
          >
              Delete
          </button>
      </div>
    </div>
  );

  const KanbanColumn: React.FC<{ status: TaskStatus, tasks: Task[] }> = ({ status, tasks }) => {
    const statusClass = getStatusColor(status);
    const borderColor = status === 'To Do' ? 'border-gray-400' : status === 'In Progress' ? 'border-blue-400' : status === 'Review' ? 'border-purple-400' : 'border-green-400';

    return (
        <div className="flex-1 min-w-[280px] max-w-[320px] bg-gray-100 rounded-xl p-4 shadow-inner flex flex-col">
            <h3 className={`text-lg font-bold mb-4 p-2 rounded-lg border-b-2 ${borderColor}`}>
                <span className={`px-2 py-1 rounded-full text-sm font-semibold ${statusClass}`}>{status}</span> ({tasks.length})
            </h3>
            
            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                {tasks.map((task) => (
                    <div key={task.id} className="mb-3">
                        <TaskCard task={task} />
                        
                        {/* Simple status update selector for demonstration */}
                        <select
                            value={task.status}
                            onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as TaskStatus)}
                            className="w-full text-sm p-2 border border-gray-200 rounded-lg mt-1 bg-white focus:ring-blue-500 focus:border-blue-500"
                        >
                            {statusColumns.map(s => (
                                <option key={s} value={s} disabled={s === status}>Move to {s}</option>
                            ))}
                            <option value={task.status} className='font-bold' disabled>Current: {task.status}</option>
                        </select>
                    </div>
                ))}
            </div>
            <button
                onClick={() => setIsTaskModalOpen(true)} // Can be enhanced to pass initial status later
                className="mt-4 w-full text-sm py-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:bg-gray-200 transition flex items-center justify-center"
            >
                <Plus className="w-4 h-4 mr-1" /> Add Task
            </button>
        </div>
    );
  };

  // --- RENDER ---

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header/Hero Section */}
      <div className="bg-gradient-to-r from-blue-700 to-purple-600 text-white p-10 shadow-lg">
        <div className="max-w-7xl mx-auto">
            <center><h1 className="text-4xl font-extrabold mb-2">TASKBOARD 🚀</h1></center>
            {/* CORRECTED TYPO: Changed 'Tasks and tasks' to 'Projects and Tasks' */}
            <p className="text-lg opacity-90">Manage all your **Projects** and **Tasks** in one powerful view.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
      
        {/* Project Creation & Selector */}
        <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border-l-4 border-blue-600">
          {/* CORRECTED LABEL: Changed 'Manage Tasks' to 'Manage Projects' */}
          <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center"><ClipboardList className="w-6 h-6 mr-2 text-blue-600"/> Manage **Projects**</h2>
          
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
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 shadow-md"
            >
              <Plus className="w-4 h-4 mr-1 inline"/> Create Project
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
                className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-purple-500 focus:border-purple-500 shadow-sm"
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
          <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border-l-4 border-purple-600">
            <h2 className="text-3xl font-extrabold mb-4 text-purple-700">{selectedProject.title}</h2>
            
            {/* Action Bar */}
            <div className="flex flex-wrap gap-4 mb-6 border-b pb-4 items-center">
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center shadow-md transition"
              >
                <Plus className="w-4 h-4 mr-1"/> Add New Task
              </button>
              <div className="flex space-x-2 bg-gray-100 p-1 rounded-xl shadow-inner">
                  <button
                      onClick={() => setViewMode('kanban')}
                      className={`py-2 px-4 rounded-lg transition text-sm font-medium flex items-center ${viewMode === 'kanban' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-200'}`}
                  >
                      <ListTodo className="w-4 h-4 mr-1"/> Kanban Board
                  </button>
                  <button
                      onClick={() => setViewMode('list')}
                      className={`py-2 px-4 rounded-lg transition text-sm font-medium flex items-center ${viewMode === 'list' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-200'}`}
                  >
                      <LayoutList className="w-4 h-4 mr-1"/> List View
                  </button>
              </div>
              {/* Assignee Input */}
              <div className="flex space-x-2 ml-auto p-2 bg-gray-50 rounded-lg border">
                  <input
                      type="text"
                      value={newAssignee}
                      onChange={(e) => setNewAssignee(e.target.value)}
                      placeholder="New Team Member"
                      className="p-2 border rounded-lg w-32 text-sm"
                  />
                  <button
                      onClick={handleAddAssignee}
                      className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg text-sm shadow-sm"
                  >
                      <Users className="w-4 h-4 mr-1 inline"/> Add
                  </button>
              </div>
            </div>
            
            {/* Kanban Board View */}
            {viewMode === 'kanban' && (
              <div className="flex overflow-x-auto space-x-6 pb-4">
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
              <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg p-2">
                {selectedProject.tasks.length === 0 ? (
                  <p className="py-4 text-center text-gray-500">No tasks in this project. Start by adding one!</p>
                ) : (
                  selectedProject.tasks.map((task) => (
                    <div key={task.id} className="flex justify-between items-center py-3 px-2 hover:bg-gray-50 transition">
                      <div className="flex items-center space-x-4">
                        <span
                          className={`text-base font-medium ${
                            task.completed ? 'text-gray-400 line-through' : 'text-gray-700'
                          }`}
                        >
                          {task.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        <div className="flex flex-wrap gap-1">
                            {task.assignees.map(a => (
                                <span key={a} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                                    {a}
                                </span>
                            ))}
                        </div>
                      </div>
                      <div className="flex space-x-3 text-sm">
                          <span className="text-gray-500">Due: {task.dueDate}</span>
                          <button
                            onClick={() => handleUpdateTaskStatus(task.id, 'Done')}
                            disabled={task.completed}
                            className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-medium py-1 px-3 rounded shadow-sm"
                          >
                            <CheckCircle className="w-4 h-4 inline mr-1"/> Complete
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task)}
                            className="bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-3 rounded shadow-sm"
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
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-teal-600">
            <h2 className="text-2xl font-bold mb-6 text-teal-700 flex items-center"><BarChart3 className="w-6 h-6 mr-2 text-teal-600"/> Project Analytics</h2>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Task Progress Line Chart */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                    <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-700"><TrendingUp className="w-5 h-5 mr-2"/> Project Task Progress</h3>
                    <LineChart width={550} height={300} data={chartData} className="mx-auto">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="name" angle={-15} textAnchor="end" height={60} stroke="#4b5563" />
                        <YAxis allowDecimals={false} stroke="#4b5563" />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '5px' }} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Line type="monotone" dataKey="Total Tasks" stroke="#8884d8" strokeWidth={2} />
                        <Line type="monotone" dataKey="Completed Tasks" stroke="#4caf50" strokeWidth={2} />
                        <Line type="monotone" dataKey="Open Tasks" stroke="#ffc658" strokeWidth={2} />
                    </LineChart>
                </div>
                
                {/* Assignee Workload Pie Chart */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                    <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-700"><Clock className="w-5 h-5 mr-2"/> Assignee Workload (Total Tasks)</h3>
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
                                  <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '5px' }} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        </PieChart>
                    ) : (
                        <p className="text-center text-gray-500 mt-10 p-4 bg-white rounded-lg border">Add tasks and assignees to see workload.</p>
                    )}
                </div>
            </div>
        </div>
        
        {/* Add Task Modal */}
        <Modal 
          isOpen={isTaskModalOpen} 
          onClose={() => setIsTaskModalOpen(false)} 
          title={`Add New Task to ${selectedProject?.title || 'Selected Project'}`}
        >
          <div className="flex flex-col space-y-4">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task Title (Required)"
              required
              className="p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            <textarea
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              placeholder="Task Description"
              rows={3}
              className="p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex space-x-4">
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                required
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                  className="flex-1 p-3 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500"
              >
                  <option value="High">Priority: High</option>
                  <option value="Medium">Priority: Medium</option>
                  <option value="Low">Priority: Low</option>
              </select>
            </div>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              required
              className="p-3 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Assignee (Required)</option>
              {selectedProject?.availableAssignees.map((assignee) => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddTask}
              disabled={!newTaskTitle || !newTaskDueDate || !selectedAssignee}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg mt-2 transition shadow-md"
            >
              Create Task
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default Taskboard;