import {StoredView} from "../../../../framework/framework";
import {TodoEvent} from "../../todos";

export type todoItem = {
    id: string
    name: string
    done: boolean
}
export type TodoView = {
    todos: todoItem[]
    todo: number
    onGoing: number
    done: number
    deleted: number
}

type Typed<K, T> = K & { __type: T }
export type AddNewTodo = Typed<{ todo: todoItem }, 'AddNewTodo'>
export type DeleteTodo = Typed<{ id: string }, 'DeleteTodo'>
export type ToggleTodo = Typed<{ id: string }, 'ToggleTodo'>
export type IncTodoCounter = Typed<{}, 'IncTodoCounter'>
export type DecTodoCounter = Typed<{}, 'DecTodoCounter'>
export type IncDeletedCounter = Typed<{}, 'IncDeletedCounter'>

export type TodoViewChange =
    AddNewTodo |
    DeleteTodo |
    ToggleTodo |
    IncTodoCounter |
    DecTodoCounter |
    IncDeletedCounter

export const storedTodoView: StoredView<TodoView, TodoEvent, TodoViewChange> = {
    changes(e: TodoEvent): TodoViewChange[] {
        switch (e.__type) {
            case "TodoAdded":
                return [
                    {__type: "AddNewTodo", todo: {id: e.id, name: e.name, done: false}},
                    {__type: "IncTodoCounter"}
                ]
            case "TodoToggled":
                return [{__type: "ToggleTodo", id: e.id}]
            case "TodoRemoved":
                return [
                    {__type: 'DeleteTodo', id: e.id},
                    {__type: "DecTodoCounter"},
                    {__type: "IncDeletedCounter"}
                ]
        }
    }, evolve(s: TodoView, c: TodoViewChange): TodoView {
        switch (c.__type) {
            case "AddNewTodo":
                return {...s, todos: [...s.todos, c.todo], onGoing: s.onGoing + 1}
            case "ToggleTodo":
                return s.todos.find(t => t.id === c.id)?.done
                    ? {
                        ...s,
                        todos: s.todos.map(t => t.id === c.id ? {...t, done: false} : t),
                        onGoing: s.onGoing + 1,
                        done: s.done - 1
                    }
                    : {
                        ...s,
                        todos: s.todos.map(t => t.id === c.id ? {...t, done: true} : t),
                        onGoing: s.onGoing -1,
                        done: s.done + 1
                    }
            case "DeleteTodo":
                return s.todos.find(t => t.id === c.id)?.done
                    ? {
                        ...s,
                        todos: s.todos.filter(t => t.id !== c.id),
                        done: s.done - 1
                    }
                    : {
                        ...s,
                        todos: s.todos.filter(t => t.id !== c.id),
                        onGoing: s.onGoing - 1,
                    }
            case "IncTodoCounter":
                return {...s, todo: s.todo + 1}
            case "DecTodoCounter":
                return {...s, todo: s.todo - 1}
            case "IncDeletedCounter":
                return {...s, deleted: s.deleted + 1}
        }
    },
    initialState: {
        todos: [],
        todo: 0,
        onGoing: 0,
        done: 0,
        deleted: 0,
    }
}
