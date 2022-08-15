export interface Snapshots<State> {
    tryLoadSnapshot(stream: string): Promise<[number, State | undefined]>

    saveSnapshot(stream: string, newVersion: number, newState: State): Promise<void>
}
