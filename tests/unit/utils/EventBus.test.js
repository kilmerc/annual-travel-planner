import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('EventBus', () => {
  let EventBus;

  beforeEach(async () => {
    vi.resetModules(); // Clear module cache to get fresh singleton
    const module = await import('../../../js/utils/EventBus.js');
    EventBus = module.default;
  });

  describe('Subscription (on)', () => {
    it('should subscribe to an event', () => {
      const callback = vi.fn();

      EventBus.on('test-event', callback);
      EventBus.emit('test-event', { data: 'test' });

      expect(callback).toHaveBeenCalledWith({ data: 'test' });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should allow multiple subscribers to same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      EventBus.on('multi-event', callback1);
      EventBus.on('multi-event', callback2);
      EventBus.on('multi-event', callback3);

      EventBus.emit('multi-event', 'test-data');

      expect(callback1).toHaveBeenCalledWith('test-data');
      expect(callback2).toHaveBeenCalledWith('test-data');
      expect(callback3).toHaveBeenCalledWith('test-data');
    });

    it('should allow subscribing to different events', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      EventBus.on('event-1', callback1);
      EventBus.on('event-2', callback2);

      EventBus.emit('event-1', 'data-1');

      expect(callback1).toHaveBeenCalledWith('data-1');
      expect(callback2).not.toHaveBeenCalled();
    });

    it('should handle subscription before any emit', () => {
      const callback = vi.fn();

      EventBus.on('never-emitted', callback);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Emission (emit)', () => {
    it('should emit event to all subscribers', () => {
      const callback = vi.fn();

      EventBus.on('emit-test', callback);
      EventBus.emit('emit-test', { foo: 'bar' });

      expect(callback).toHaveBeenCalledWith({ foo: 'bar' });
    });

    it('should pass data to callback', () => {
      const callback = vi.fn();

      EventBus.on('data-event', callback);
      EventBus.emit('data-event', { id: 123, name: 'Test' });

      expect(callback).toHaveBeenCalledWith({ id: 123, name: 'Test' });
    });

    it('should handle emit without subscribers', () => {
      // Should not throw
      expect(() => {
        EventBus.emit('no-subscribers', 'data');
      }).not.toThrow();
    });

    it('should handle multiple emits', () => {
      const callback = vi.fn();

      EventBus.on('repeat-event', callback);

      EventBus.emit('repeat-event', 'first');
      EventBus.emit('repeat-event', 'second');
      EventBus.emit('repeat-event', 'third');

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenNthCalledWith(1, 'first');
      expect(callback).toHaveBeenNthCalledWith(2, 'second');
      expect(callback).toHaveBeenNthCalledWith(3, 'third');
    });

    it('should handle emit with no data', () => {
      const callback = vi.fn();

      EventBus.on('no-data-event', callback);
      EventBus.emit('no-data-event');

      expect(callback).toHaveBeenCalledWith(undefined);
    });

    it('should handle different data types', () => {
      const callback = vi.fn();

      EventBus.on('type-test', callback);

      EventBus.emit('type-test', 'string');
      EventBus.emit('type-test', 123);
      EventBus.emit('type-test', true);
      EventBus.emit('type-test', null);
      EventBus.emit('type-test', { obj: 'value' });
      EventBus.emit('type-test', ['array']);

      expect(callback).toHaveBeenCalledTimes(6);
    });
  });

  describe('Unsubscription (off)', () => {
    it('should unsubscribe from event', () => {
      const callback = vi.fn();

      EventBus.on('unsub-test', callback);
      EventBus.off('unsub-test', callback);
      EventBus.emit('unsub-test', 'data');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should only unsubscribe specific callback', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      EventBus.on('selective-unsub', callback1);
      EventBus.on('selective-unsub', callback2);

      EventBus.off('selective-unsub', callback1);
      EventBus.emit('selective-unsub', 'test');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith('test');
    });

    it('should handle unsubscribe of non-existent event', () => {
      const callback = vi.fn();

      // Should not throw
      expect(() => {
        EventBus.off('non-existent', callback);
      }).not.toThrow();
    });

    it('should handle unsubscribe of non-existent callback', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      EventBus.on('test-event', callback1);

      // Trying to unsubscribe callback2 which was never subscribed
      expect(() => {
        EventBus.off('test-event', callback2);
      }).not.toThrow();
    });

    it('should handle multiple unsubscribe calls', () => {
      const callback = vi.fn();

      EventBus.on('repeat-unsub', callback);
      EventBus.off('repeat-unsub', callback);
      EventBus.off('repeat-unsub', callback); // Second call

      EventBus.emit('repeat-unsub', 'data');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Once Subscription (once)', () => {
    it('should subscribe and automatically unsubscribe after first emit', () => {
      const callback = vi.fn();

      EventBus.once('once-event', callback);

      EventBus.emit('once-event', 'first');
      EventBus.emit('once-event', 'second');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('first');
    });

    it('should pass data to once callback', () => {
      const callback = vi.fn();

      EventBus.once('once-data', callback);
      EventBus.emit('once-data', { test: 'value' });

      expect(callback).toHaveBeenCalledWith({ test: 'value' });
    });

    it('should allow multiple once subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      EventBus.once('multi-once', callback1);
      EventBus.once('multi-once', callback2);

      EventBus.emit('multi-once', 'data');

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      EventBus.emit('multi-once', 'second-data');

      // Still only called once
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should work alongside regular subscribers', () => {
      const onceCallback = vi.fn();
      const regularCallback = vi.fn();

      EventBus.once('mixed-event', onceCallback);
      EventBus.on('mixed-event', regularCallback);

      EventBus.emit('mixed-event', 'first');
      EventBus.emit('mixed-event', 'second');

      expect(onceCallback).toHaveBeenCalledTimes(1);
      expect(regularCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should catch errors in callbacks and continue', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const successCallback = vi.fn();

      EventBus.on('error-event', errorCallback);
      EventBus.on('error-event', successCallback);

      // Should not throw, error should be caught
      expect(() => {
        EventBus.emit('error-event', 'data');
      }).not.toThrow();

      // Both callbacks should be called
      expect(errorCallback).toHaveBeenCalled();
      expect(successCallback).toHaveBeenCalled();
    });

    it('should log errors to console', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const errorCallback = () => {
        throw new Error('Callback error');
      };

      EventBus.on('error-log', errorCallback);
      EventBus.emit('error-log', 'data');

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle subscription/unsubscription during emit', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      let callback3Called = false;
      const callback3 = vi.fn(() => {
        if (!callback3Called) {
          callback3Called = true;
          // Subscribe new callback during emit
          EventBus.on('complex-event', callback2);
        }
      });

      EventBus.on('complex-event', callback1);
      EventBus.on('complex-event', callback3);

      EventBus.emit('complex-event', 'first');

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);

      // callback2 should be called on next emit
      EventBus.emit('complex-event', 'second');

      expect(callback1).toHaveBeenCalledTimes(2);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(2);
    });

    it('should maintain callback order', () => {
      const callOrder = [];

      EventBus.on('order-event', () => callOrder.push(1));
      EventBus.on('order-event', () => callOrder.push(2));
      EventBus.on('order-event', () => callOrder.push(3));

      EventBus.emit('order-event', 'data');

      expect(callOrder).toEqual([1, 2, 3]);
    });

    it('should handle same callback subscribed multiple times', () => {
      const callback = vi.fn();

      EventBus.on('duplicate-sub', callback);
      EventBus.on('duplicate-sub', callback);

      EventBus.emit('duplicate-sub', 'data');

      // Callback called twice (subscribed twice)
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should handle unsubscribe of duplicate subscriptions', () => {
      const callback = vi.fn();

      EventBus.on('dup-unsub', callback);
      EventBus.on('dup-unsub', callback);

      EventBus.off('dup-unsub', callback); // Removes first instance

      EventBus.emit('dup-unsub', 'data');

      // Should still be called once (second instance remains)
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Isolation', () => {
    it('should not trigger callbacks for different events', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      EventBus.on('event-a', callback1);
      EventBus.on('event-b', callback2);

      EventBus.emit('event-a', 'data-a');

      expect(callback1).toHaveBeenCalledWith('data-a');
      expect(callback2).not.toHaveBeenCalled();
    });

    it('should handle events with similar names', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      EventBus.on('state', callback1);
      EventBus.on('state:changed', callback2);
      EventBus.on('state:changed:year', callback3);

      EventBus.emit('state:changed', 'data');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith('data');
      expect(callback3).not.toHaveBeenCalled();
    });
  });

  describe('Memory Management', () => {
    it('should clean up callbacks when unsubscribed', () => {
      const callback = vi.fn();

      EventBus.on('cleanup-test', callback);
      EventBus.off('cleanup-test', callback);

      // Emit should not call the callback
      EventBus.emit('cleanup-test', 'data');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle once callbacks cleanup', () => {
      const callback = vi.fn();

      EventBus.once('once-cleanup', callback);
      EventBus.emit('once-cleanup', 'first');

      // Second emit should not trigger callback
      EventBus.emit('once-cleanup', 'second');

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
