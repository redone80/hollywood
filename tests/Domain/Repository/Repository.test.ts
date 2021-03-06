import { IRepository } from "../../../src/Domain";
import { EventBus, EventStore, InMemoryEventStore } from "../../../src/EventStore";
import { Dog } from "../AggregateRoot.test";

export class DogRepository implements IRepository<Dog> {

    constructor(private eventStore: EventStore<Dog>) {}

    public save(eventSourced: Dog): void {
        this
            .eventStore
            .save(eventSourced);
    }

    public async load(aggregateRootId: string): Promise<Dog> {
        return await this.eventStore.load(aggregateRootId);
    }
}

describe("Repository", () => {
    it("Repository should store and retieve AggregateRoots", async () => {
        const store = new EventStore<Dog>(Dog, new InMemoryEventStore(), new EventBus());
        const repo = new DogRepository(store);
        const pluto = new Dog();

        pluto.sayWolf();

        repo.save(pluto);

        const another: Dog = await repo.load(pluto.getAggregateRootId());

        expect(another.getAggregateRootId()).toBe(pluto.getAggregateRootId());
        expect(another.wolfCount).toBe(pluto.wolfCount);
    });
});
