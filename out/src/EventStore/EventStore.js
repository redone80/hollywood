"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const AggregateRootNotFoundException_1 = require("./Exception/AggregateRootNotFoundException");
const SnapshotStore_1 = require("./Snapshot/SnapshotStore");
const MIN_SNAPSHOT_MARGIN = 10;
class EventStore {
    constructor(modelConstructor, dbal, eventBus, snapshotStoreDbal, snapshotMargin) {
        this.modelConstructor = modelConstructor;
        this.dbal = dbal;
        this.eventBus = eventBus;
        this.snapshotMargin = snapshotMargin || MIN_SNAPSHOT_MARGIN;
        if (snapshotStoreDbal) {
            this.snapshotStore = new SnapshotStore_1.default(snapshotStoreDbal);
        }
    }
    load(aggregateId) {
        return __awaiter(this, void 0, void 0, function* () {
            let from = 0;
            let eventSourced = null;
            if (this.snapshotStore) {
                const snapshot = yield this.snapshotStore.retrieve(aggregateId);
                if (snapshot !== null && snapshot !== undefined) {
                    eventSourced = new (this.modelConstructor)();
                    eventSourced.fromSnapshot(snapshot);
                    from = eventSourced.version();
                }
            }
            const stream = yield this.dbal.load(aggregateId, from);
            if (stream.isEmpty()) {
                throw new AggregateRootNotFoundException_1.default();
            }
            const entity = eventSourced || new (this.modelConstructor)();
            return entity.fromHistory(stream);
        });
    }
    save(entity) {
        return __awaiter(this, void 0, void 0, function* () {
            const stream = entity.getUncommitedEvents();
            yield this.append(entity.getAggregateRootId(), stream);
            if (this.snapshotStore && this.isSnapshotNeeded(entity.version())) {
                yield this.snapshotStore.snapshot(entity);
            }
            stream.events.forEach((message) => this.eventBus.publish(message));
        });
    }
    append(aggregateId, stream) {
        return __awaiter(this, void 0, void 0, function* () {
            const lastEvent = stream.events[stream.events.length - 1];
            yield this.dbal.append(aggregateId, stream);
        });
    }
    isSnapshotNeeded(version) {
        return version !== 0 && version / this.snapshotMargin >= 1 && version % this.snapshotMargin === 0;
    }
}
exports.default = EventStore;
//# sourceMappingURL=EventStore.js.map