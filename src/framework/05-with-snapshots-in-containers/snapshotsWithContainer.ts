export interface SnapshotsWithContainer<State> {
    tryLoadSnapshot(stream: string, container: string): Promise<[number, State | undefined]>

    saveSnapshot(stream: string, container: string, newVersion: number, newState: State): Promise<void>
}
