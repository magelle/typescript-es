"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.todoDecider = void 0;
const todoInitialState = {
    todos: []
};
const decide = (command, state) => {
    switch (command.__type) {
        case "AddTodo":
            return [{ name: command.name, __type: 'TodoAdded' }];
        case "ToggleTodo":
            return [{ name: command.name, __type: 'TodoToggled' }];
        case "RemoveTodo":
            return [{ name: command.name, __type: 'TodoRemoved' }];
    }
    return [];
};
const evolve = (state, event) => {
    switch (event.__type) {
        case "TodoAdded":
            return Object.assign(Object.assign({}, state), { todos: [...state.todos, { name: event.name, done: false }] });
        case "TodoToggled":
            return Object.assign(Object.assign({}, state), { todos: state.todos.map((t) => t.name === event.name ? Object.assign(Object.assign({}, t), { done: true }) : t) });
        case "TodoRemoved":
            return Object.assign(Object.assign({}, state), { todos: state.todos.filter(t => t.name !== event.name) });
    }
};
exports.todoDecider = {
    decide,
    evolve,
    initialState: todoInitialState,
    isTerminal: () => false
};
