import EventBus from './EventBus.js';

/**
 * EntityManager — ECS-lite registry.
 * All scene objects are entities. Logic never lives on raw meshes.
 *
 * Entity shape:
 * {
 *   id:         string,
 *   name:       string,
 *   components: {
 *     transform:          { position, rotation, scale },
 *     mesh:               THREE.Object3D | null,
 *     interactable:       boolean,
 *     stateMachine:       FSM | null,
 *     animationController: object | null,
 *   }
 * }
 */
const EntityManager = (() => {
  const _entities = new Map();
  let _nextId = 0;

  return {
    /**
     * Create and register a new entity.
     * @param {string} name
     * @param {Object} components - partial component overrides
     * @returns {Object} entity
     */
    create(name, components = {}) {
      const id = `e_${_nextId++}`;
      const entity = {
        id,
        name,
        components: {
          transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale:    { x: 1, y: 1, z: 1 },
          },
          mesh:               null,
          interactable:       false,
          stateMachine:       null,
          animationController: null,
          ...components,
        }
      };
      _entities.set(id, entity);
      EventBus.emit('ENTITY_CREATED', { id, name });
      return entity;
    },

    /** Get by ID */
    get(id) { return _entities.get(id) ?? null; },

    /** Get by name (first match) */
    getByName(name) {
      for (const e of _entities.values()) {
        if (e.name === name) return e;
      }
      return null;
    },

    /** All entities */
    getAll() { return Array.from(_entities.values()); },

    /** Attach/replace a component */
    addComponent(id, key, value) {
      const e = _entities.get(id);
      if (e) e.components[key] = value;
    },

    /** Remove an entity */
    destroy(id) {
      if (_entities.has(id)) {
        EventBus.emit('ENTITY_DESTROYED', { id });
        _entities.get(id)?.components?.stateMachine?.dispose?.();
        _entities.delete(id);
      }
    },

    /** Dispose all */
    dispose() {
      _entities.forEach((_, id) => this.destroy(id));
    }
  };
})();

export default EntityManager;
