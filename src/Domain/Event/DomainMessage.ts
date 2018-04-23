import DomainEvent from "./DomainEvent";

/**
 * @internal
 */
export default class DomainMessage {

    public static create(uuid: string, event: DomainEvent, metadata: any[] = []): DomainMessage {
        return new DomainMessage(
            uuid,
            event,
            metadata,
        );
    }

    public readonly eventType: string;
    private constructor(
        public readonly uuid: string,
        public readonly event: DomainEvent,
        public readonly metadata: any[],
    ) {
        this.eventType = (event as any).constructor.name;
    }
}
