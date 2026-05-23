"use client";

import {useState} from "react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Checkbox} from "@/components/ui/checkbox";
import {Badge} from "@/components/ui/badge";
import {useTasks} from "@/context/tasks-context";
import {Skeleton} from "@/components/ui/skeleton";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Plus} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {Label} from "@/components/ui/label";
import {useToast} from "@/hooks/use-toast";
import {GradientIcon} from "@/components/ui/gradient-icon";
import type {Task} from "@/lib/types";

const TaskTable = ({tasks, loading, toggleTask, showCompleted = false}: { 
    tasks: Task[], 
    loading: boolean,
    toggleTask: (id: string) => void,
    showCompleted?: boolean 
}) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Task</TableHead>
                <TableHead className="text-right">Status</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {loading ? (
                Array.from({length: 3}).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={3}>
                            <Skeleton className="h-8 w-full"/>
                        </TableCell>
                    </TableRow>
                ))
            ) : tasks.length > 0 ? (
                tasks.map(task => (
                    <TableRow key={task.id}>
                        <TableCell>
                            <Checkbox
                                checked={task.completed}
                                onCheckedChange={() => toggleTask(task.id)}
                            />
                        </TableCell>
                        <TableCell
                            className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</TableCell>
                        <TableCell className="text-right">
                            {showCompleted ? (
                                <Badge variant="secondary">Completed</Badge>
                            ) : (
                                <Badge variant="outline">Pending</Badge>
                            )}
                        </TableCell>
                    </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                        No tasks here. Add one to get started!
                    </TableCell>
                </TableRow>
            )}
        </TableBody>
    </Table>
);

export default function TasksPage() {
    const {tasks, loading, toggleTask, addTask} = useTasks();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const {toast} = useToast();

    const upcomingTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);

    const handleAddTask = () => {
        if (!newTaskTitle.trim()) {
            toast({
                variant: "destructive",
                title: "Task title cannot be empty.",
            });
            return;
        }
        addTask({title: newTaskTitle});
        setNewTaskTitle("");
        setDialogOpen(false);
        toast({
            title: "Task Added",
            description: `${newTaskTitle} has been added to your list.`,
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-gradient flex items-center gap-2">
                            <GradientIcon name="CheckSquare"/>
                            Manage Discussions & Tasks
                        </CardTitle>
                        <CardDescription>
                            Keep track of your discussion posts and general to-do items.
                        </CardDescription>
                    </div>
                    <Button onClick={() => setDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4"/>
                        Add Task
                    </Button>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="upcoming">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                            <TabsTrigger value="completed">Completed</TabsTrigger>
                        </TabsList>
                        <TabsContent value="upcoming">
                            <TaskTable tasks={upcomingTasks} loading={loading} toggleTask={toggleTask}/>
                        </TabsContent>
                        <TabsContent value="completed">
                            <TaskTable tasks={completedTasks} loading={loading} toggleTask={toggleTask} showCompleted/>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add a New Task</DialogTitle>
                        <DialogDescription>What do you need to get done?</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="task-title" className="sr-only">Task Title</Label>
                        <Input
                            id="task-title"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="e.g., 'Post in PSY-101 discussion forum'"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddTask}>Add Task</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

    
