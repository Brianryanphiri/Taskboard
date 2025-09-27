import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
    Plus, Users, LayoutList, ListTodo, ClipboardList, TrendingUp, BarChart3, Clock, CheckCircle
} from "lucide-react";



type SubTaskPriority = 'Low' | 'Medium' | 'High'; 
type SubTaskStatus = 'To Do' | 'In Progress' | 'Review' | 'Done'; 
type TaskStatus = 'Active' | 'On Hold' | 'Archived';

interface SubTask { // Renamed from Task
    id: number;
    title: string;
    description: string;
    dueDate: string;
    assignees: string[];
    completed: boolean;
    priority: SubTaskPriority;
    status: SubTaskStatus;
    taskId: number; 
}

interface Task { 
    title: string; // This is now the main Task title
    description: string;
    subTasks: SubTask[]; // Renamed from tasks
    availableAssignees: string[];
    status: TaskStatus; // This is the status of the main Task
}

// --- UTILITY COMPONENTS (Modal remains the same) ---

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

// --- HELPER FUNCTIONS (Updated types) ---

const getPriorityColor = (priority: SubTaskPriority) => { // Updated type
    switch (priority) {
        case 'High': return 'bg-red-500 text-white';
        case 'Medium': return 'bg-yellow-500 text-gray-800';
        case 'Low': return 'bg-green-500 text-white';
        default: return 'bg-gray-200';
    }
};

const getStatusColor = (status: SubTaskStatus) => { // Updated type
    switch (status) {
        case 'To Do': return 'bg-gray-100 text-gray-700 border-gray-300';
        case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-300';
        case 'Review': return 'bg-purple-100 text-purple-700 border-purple-300';
        case 'Done': return 'bg-green-100 text-green-700 border-green-300';
        default: return 'bg-gray-100';
    }
}

// --- MAIN COMPONENT (Taskboard now manages 'Task' which contains 'SubTask') ---

const Taskboard: React.FC = () => {
    // --- STATE (REPLACED 'projects' with 'tasks', 'Project' with 'Task') ---
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState(''); // Renamed from newProjectTitle
    const [newAssignee, setNewAssignee] = useState('');

    // SubTask Form State (Renamed from Task Form State)
    const [newSubTaskTitle, setNewSubTaskTitle] = useState(''); // Renamed from newTaskTitle
    const [newSubTaskDescription, setNewSubTaskDescription] = useState(''); // Renamed from newTaskDescription
    const [newSubTaskDueDate, setNewSubTaskDueDate] = useState(''); // Renamed from newTaskDueDate
    const [newSubTaskPriority, setNewSubTaskPriority] = useState<SubTaskPriority>('Medium'); // Renamed from newTaskPriority
    const [selectedAssignee, setSelectedAssignee] = useState<string>('');

    // Modal/View State (REPLACED 'selectedProject' with 'selectedTask', 'Project' with 'Task')
    const [selectedTask, setSelectedTask] = useState<Task | null>(null); // Renamed from selectedProject
    const [isSubTaskModalOpen, setIsSubTaskModalOpen] = useState(false); // Renamed from isTaskModalOpen
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');

    // --- SIDE EFFECTS (Local Storage Persistence) ---
    useEffect(() => {
        const storedTasks = localStorage.getItem('pm_tool_tasks'); // Renamed storage key
        if (storedTasks) {
            const loadedTasks: Task[] = JSON.parse(storedTasks); // Updated type
            setTasks(loadedTasks);
            // Select the first task or maintain the selection if possible
            if (loadedTasks.length > 0) {
                setSelectedTask(loadedTasks[0]);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('pm_tool_tasks', JSON.stringify(tasks)); // Renamed storage key
    }, [tasks]);


    // --- HANDLERS (REPLACED 'Project' with 'Task', 'Task' with 'SubTask') ---

    const handleAddTask = () => { // Renamed from handleAddProject
        if (!newTaskTitle.trim()) return;
        const newMainTask: Task = { // Renamed variable
            id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
            title: newTaskTitle,
            description: 'A new high-level task for the team.', // Updated description
            subTasks: [], // Renamed from tasks
            availableAssignees: [],
            status: 'Active',
        };
        const newTaskList = [...tasks, newMainTask]; // Renamed variable
        setTasks(newTaskList);
        setNewTaskTitle('');
        setSelectedTask(newMainTask); // Auto-select the new task
    };

    const handleAddAssignee = () => {
        if (selectedTask && newAssignee.trim()) {
            const updatedTasks = tasks.map(t => // Renamed variable
                t.id === selectedTask.id
                    ? { ...t, availableAssignees: Array.from(new Set([...t.availableAssignees, newAssignee.trim()])) }
                    : t
            );
            setTasks(updatedTasks);
            setSelectedTask(prev => prev ? updatedTasks.find(up => up.id === prev.id) || null : null);
            setNewAssignee('');
        }
    };

    const handleAddSubTask = () => { // Renamed from handleAddTask
        if (selectedTask && newSubTaskTitle.trim() && selectedAssignee) {
            const newSubTask: SubTask = { // Renamed variable
                id: selectedTask.subTasks.length > 0 ? Math.max(...selectedTask.subTasks.map(st => st.id)) + 1 : 1, // Updated array
                taskId: selectedTask.id, // Renamed from projectId
                title: newSubTaskTitle,
                description: newSubTaskDescription,
                dueDate: newSubTaskDueDate,
                assignees: [selectedAssignee],
                completed: false,
                priority: newSubTaskPriority,
                status: 'To Do',
            };

            const updatedTasks = tasks.map(t => // Renamed variable
                t.id === selectedTask.id
                    ? { ...t, subTasks: [...t.subTasks, newSubTask] } // Renamed inner key
                    : t
            );
            setTasks(updatedTasks);

            // Reset form and close modal
            setNewSubTaskTitle('');
            setNewSubTaskDescription('');
            setNewSubTaskDueDate('');
            setNewSubTaskPriority('Medium');
            setSelectedAssignee('');
            setIsSubTaskModalOpen(false); // Renamed state
        }
    };

    const handleUpdateSubTaskStatus = useCallback((subTaskId: number, newStatus: SubTaskStatus) => { // Updated name and type
        if (!selectedTask) return;

        const updatedTasks = tasks.map(t => { // Renamed variable
            if (t.id === selectedTask.id) {
                const updatedSubTasks = t.subTasks.map(st => // Renamed variable
                    st.id === subTaskId
                        ? { ...st, status: newStatus, completed: newStatus === 'Done' }
                        : st
                );
                return { ...t, subTasks: updatedSubTasks }; // Renamed inner key
            }
            return t;
        });

        setTasks(updatedTasks);
        // Keep selectedTask reference updated
        setSelectedTask(prev => prev ? updatedTasks.find(up => up.id === prev.id) || null : null);
    }, [tasks, selectedTask]);

    const handleDeleteSubTask = (subTask: SubTask) => { // Updated name and type
        if (selectedTask) {
            const updatedTasks = tasks.map(t => { // Renamed variable
                if (t.id === selectedTask.id) {
                    return { ...t, subTasks: t.subTasks.filter(st => st.id !== subTask.id) }; // Renamed inner key
                }
                return t;
            });
            setTasks(updatedTasks);
            setSelectedTask(prev => prev ? updatedTasks.find(up => up.id === prev.id) || null : null);
        }
    };

    // --- MEMOIZED DATA FOR CHARTS/KANBAN (REPLACED 'project' with 'task') ---

    const chartData = useMemo(() => tasks.map(task => ({ // Renamed variable/logic
        name: task.title,
        'Total SubTasks': task.subTasks.length, // Renamed label/key
        'Completed SubTasks': task.subTasks.filter(st => st.completed).length, // Renamed label/key
        'Open SubTasks': task.subTasks.filter(st => !st.completed).length, // Renamed label/key
    })), [tasks]);

    const assigneeWorkloadData = useMemo(() => {
        const workload: { [key: string]: number } = {};
        tasks.forEach(t => { // Renamed variable
            t.subTasks.forEach(st => { // Renamed inner key/variable
                st.assignees.forEach(a => {
                    workload[a] = (workload[a] || 0) + 1;
                });
            });
        });
        return Object.entries(workload).map(([name, subTasks]) => ({ name, subTasks })); // Renamed key
    }, [tasks]);

    const kanbanSubTasks = useMemo(() => { // Renamed variable
        if (!selectedTask) return {};
        const subTaskMap: { [key in SubTaskStatus]?: SubTask[] } = { // Updated type and name
            'To Do': [],
            'In Progress': [],
            'Review': [],
            'Done': [],
        };
        selectedTask.subTasks.forEach(subTask => { // Renamed inner key/variable
            subTaskMap[subTask.status] = [...(subTaskMap[subTask.status] || []), subTask];
        });
        return subTaskMap;
    }, [selectedTask]);

    const statusColumns: SubTaskStatus[] = ['To Do', 'In Progress', 'Review', 'Done']; // Updated type


    // --- RENDER HELPERS (REPLACED 'Task' with 'SubTask') ---

    const SubTaskCard: React.FC<{ subTask: SubTask }> = ({ subTask }) => ( // Renamed component/prop
        <div className="bg-white p-4 rounded-lg shadow-md border-t-4 border-blue-500/50 hover:shadow-lg transition mb-3">
            <div className="flex justify-between items-start">
                <h4 className="font-semibold text-base truncate text-gray-800">{subTask.title}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(subTask.priority)}`}>
                    {subTask.priority}
                </span>
            </div>
            <p className="text-sm text-gray-500 my-1 line-clamp-2">{subTask.description}</p>

            <div className="flex flex-wrap gap-1 mt-2 border-t border-gray-100 pt-2">
                {subTask.assignees.map(a => (
                    <span key={a} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                        {a}
                    </span>
                ))}
            </div>
            <div className="mt-2 flex justify-between items-center text-xs text-gray-600">
                <span>Due: {subTask.dueDate}</span>
                <button
                    onClick={() => handleDeleteSubTask(subTask)} // Updated handler
                    className="text-red-500 hover:text-red-700 font-medium transition"
                >
                    Delete
                </button>
            </div>
        </div>
    );

    const KanbanColumn: React.FC<{ status: SubTaskStatus, subTasks: SubTask[] }> = ({ status, subTasks }) => { // Updated name/prop
        const statusClass = getStatusColor(status);
        const borderColor = status === 'To Do' ? 'border-gray-400' : status === 'In Progress' ? 'border-blue-400' : status === 'Review' ? 'border-purple-400' : 'border-green-400';

        return (
            <div className="flex-1 min-w-[280px] max-w-[320px] bg-gray-100 rounded-xl p-4 shadow-inner flex flex-col">
                <h3 className={`text-lg font-bold mb-4 p-2 rounded-lg border-b-2 ${borderColor}`}>
                    <span className={`px-2 py-1 rounded-full text-sm font-semibold ${statusClass}`}>{status}</span> ({subTasks.length})
                </h3>

                <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                    {subTasks.map((subTask) => (
                        <div key={subTask.id} className="mb-3">
                            <SubTaskCard subTask={subTask} /> {/* Renamed component/prop */}

                            {/* Simple status update selector for demonstration */}
                            <select
                                value={subTask.status}
                                onChange={(e) => handleUpdateSubTaskStatus(subTask.id, e.target.value as SubTaskStatus)} // Updated handler/type
                                className="w-full text-sm p-2 border border-gray-200 rounded-lg mt-1 bg-white focus:ring-blue-500 focus:border-blue-500"
                            >
                                {statusColumns.map(s => (
                                    <option key={s} value={s} disabled={s === status}>Move to {s}</option>
                                ))}
                                <option value={subTask.status} className='font-bold' disabled>Current: {subTask.status}</option>
                            </select>
                        </div>
                    ))}
                </div>
                <button
                    onClick={() => setIsSubTaskModalOpen(true)} // Updated state
                    className="mt-4 w-full text-sm py-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:bg-gray-200 transition flex items-center justify-center"
                >
                    <Plus className="w-4 h-4 mr-1" /> Add SubTask {/* Renamed text */}
                </button>
            </div>
        );
    };

    // --- RENDER (REPLACED 'Project' with 'Task') ---

    return (
        <div className="min-h-screen bg-gray-50">

            {/* Header/Hero Section */}
            <div className="bg-gradient-to-r from-blue-700 to-purple-600 text-white p-10 shadow-lg">
                <div className="max-w-7xl mx-auto">
                    <center><h1 className="text-4xl font-extrabold mb-2">TASKBOARD 🚀</h1></center>
                    <p className="text-lg opacity-90">Manage all your **Tasks** and **SubTasks** in one powerful view.</p> {/* Updated text */}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">

                {/* Task Creation & Selector (Renamed from Project) */}
                <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border-l-4 border-blue-600">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center"><ClipboardList className="w-6 h-6 mr-2 text-blue-600"/> Manage **Tasks**</h2> {/* Updated text */}

                    <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Enter New Task Title" // Updated text
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                            onClick={handleAddTask} // Updated handler
                            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 shadow-md"
                        >
                            <Plus className="w-4 h-4 mr-1 inline"/> Create Task {/* Updated text */}
                        </button>
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Active Task:</label> {/* Updated text */}
                        <select
                            value={selectedTask?.id || ''}
                            onChange={(e) => {
                                const task = tasks.find(t => t.id === parseInt(e.target.value)); // Updated variable/logic
                                setSelectedTask(task || null);
                                setViewMode('kanban');
                            }}
                            className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-purple-500 focus:border-purple-500 shadow-sm"
                        >
                            <option value="">-- Select Task --</option> {/* Updated text */}
                            {tasks.map((task) => ( // Updated variable
                                <option key={task.id} value={task.id}>
                                    {task.title} ({task.subTasks.length} sub-tasks) {/* Updated text/key */}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Task Detail View (Conditional) (Renamed from Project Detail) */}
                {selectedTask && (
                    <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border-l-4 border-purple-600">
                        <h2 className="text-3xl font-extrabold mb-4 text-purple-700">{selectedTask.title}</h2>

                        {/* Action Bar */}
                        <div className="flex flex-wrap gap-4 mb-6 border-b pb-4 items-center">
                            <button
                                onClick={() => setIsSubTaskModalOpen(true)} // Updated state
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center shadow-md transition"
                            >
                                <Plus className="w-4 h-4 mr-1"/> Add New SubTask {/* Updated text */}
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
                                        subTasks={kanbanSubTasks[status] || []} // Updated variable
                                    />
                                ))}
                            </div>
                        )}

                        {/* Simple List View (Fallback/Detail) */}
                        {viewMode === 'list' && (
                            <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg p-2">
                                {selectedTask.subTasks.length === 0 ? ( // Updated key
                                    <p className="py-4 text-center text-gray-500">No sub-tasks in this task. Start by adding one!</p> {/* Updated text */}
                                ) : (
                                    selectedTask.subTasks.map((subTask) => ( // Updated key/variable
                                        <div key={subTask.id} className="flex justify-between items-center py-3 px-2 hover:bg-gray-50 transition">
                                            <div className="flex items-center space-x-4">
                                                <span
                                                    className={`text-base font-medium ${
                                                        subTask.completed ? 'text-gray-400 line-through' : 'text-gray-700'
                                                    }`}
                                                >
                                                    {subTask.title}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getPriorityColor(subTask.priority)}`}>
                                                    {subTask.priority}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(subTask.status)}`}>
                                                    {subTask.status}
                                                </span>
                                                <div className="flex flex-wrap gap-1">
                                                    {subTask.assignees.map(a => (
                                                        <span key={a} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                                                            {a}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex space-x-3 text-sm">
                                                <span className="text-gray-500">Due: {subTask.dueDate}</span>
                                                <button
                                                    onClick={() => handleUpdateSubTaskStatus(subTask.id, 'Done')} // Updated handler
                                                    disabled={subTask.completed}
                                                    className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-medium py-1 px-3 rounded shadow-sm"
                                                >
                                                    <CheckCircle className="w-4 h-4 inline mr-1"/> Complete
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSubTask(subTask)} // Updated handler
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
                    <h2 className="text-2xl font-bold mb-6 text-teal-700 flex items-center"><BarChart3 className="w-6 h-6 mr-2 text-teal-600"/> Task Analytics</h2> {/* Updated text */}

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {/* SubTask Progress Line Chart (Renamed from Task Progress) */}
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-700"><TrendingUp className="w-5 h-5 mr-2"/> Task SubTask Progress</h3> {/* Updated text */}
                            <LineChart width={550} height={300} data={chartData} className="mx-auto">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis dataKey="name" angle={-15} textAnchor="end" height={60} stroke="#4b5563" />
                                <YAxis allowDecimals={false} stroke="#4b5563" />
                                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '5px' }} />
                                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                <Line type="monotone" dataKey="Total SubTasks" stroke="#8884d8" strokeWidth={2} /> {/* Updated key */}
                                <Line type="monotone" dataKey="Completed SubTasks" stroke="#4caf50" strokeWidth={2} /> {/* Updated key */}
                                <Line type="monotone" dataKey="Open SubTasks" stroke="#ffc658" strokeWidth={2} /> {/* Updated key */}
                            </LineChart>
                        </div>

                        {/* Assignee Workload Pie Chart */}
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-700"><Clock className="w-5 h-5 mr-2"/> Assignee Workload (Total SubTasks)</h3> {/* Updated text */}
                            {assigneeWorkloadData.length > 0 ? (
                                <PieChart width={550} height={300} className="mx-auto">
                                    <Pie
                                        data={assigneeWorkloadData}
                                        dataKey="subTasks" // Updated key
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
                                <p className="text-center text-gray-500 mt-10 p-4 bg-white rounded-lg border">Add sub-tasks and assignees to see workload.</p> {/* Updated text */}
                            )}
                        </div>
                    </div>
                </div>

                {/* Add SubTask Modal (Renamed from Add Task Modal) */}
                <Modal
                    isOpen={isSubTaskModalOpen} // Updated state
                    onClose={() => setIsSubTaskModalOpen(false)} // Updated state
                    title={`Add New SubTask to ${selectedTask?.title || 'Selected Task'}`} // Updated text/key
                >
                    <div className="flex flex-col space-y-4">
                        <input
                            type="text"
                            value={newSubTaskTitle} // Updated state
                            onChange={(e) => setNewSubTaskTitle(e.target.value)} // Updated state
                            placeholder="SubTask Title (Required)" // Updated text
                            required
                            className="p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                        <textarea
                            value={newSubTaskDescription} // Updated state
                            onChange={(e) => setNewSubTaskDescription(e.target.value)} // Updated state
                            placeholder="SubTask Description" // Updated text
                            rows={3}
                            className="p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div className="flex space-x-4">
                            <input
                                type="date"
                                value={newSubTaskDueDate} // Updated state
                                onChange={(e) => setNewSubTaskDueDate(e.target.value)} // Updated state
                                required
                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            />
                            <select
                                value={newSubTaskPriority} // Updated state
                                onChange={(e) => setNewSubTaskPriority(e.target.value as SubTaskPriority)} // Updated state/type
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
                            {selectedTask?.availableAssignees.map((assignee) => ( // Updated key
                                <option key={assignee} value={assignee}>
                                    {assignee}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handleAddSubTask} // Updated handler
                            disabled={!newSubTaskTitle || !newSubTaskDueDate || !selectedAssignee} // Updated states
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg mt-2 transition shadow-md"
                        >
                            Create SubTask {/* Updated text */}
                        </button>
                    </div>
                </Modal>
            </div>
        </div>
    );
};

export default Taskboard;