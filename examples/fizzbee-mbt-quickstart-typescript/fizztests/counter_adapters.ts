// Generated scaffold by fizzbee-mbt generator
// Source: ../../fizzbee-mbt-quickstart/specs/simple-counter/counter.fizz
// Update the methods with your implementation.

import { Arg, NotImplementedError } from '@fizzbee/mbt';
import { CounterRole, CounterModel } from './counter_interfaces.js';

// Role adaptors

export class CounterRoleAdapter implements CounterRole {
  // TODO: Add constructor parameters for your role dependencies
  async actionInc(args: Arg[]): Promise<any> {
    // TODO: implement action Inc
    throw new NotImplementedError('Counter.actionInc not implemented');
  }
  async actionGet(args: Arg[]): Promise<any> {
    // TODO: implement action Get
    throw new NotImplementedError('Counter.actionGet not implemented');
  }
  async actionDec(args: Arg[]): Promise<any> {
    // TODO: implement action Dec
    throw new NotImplementedError('Counter.actionDec not implemented');
  }
}

// Model adaptor
export class CounterModelAdapter implements CounterModel {
  // TODO: Add fields for your model state and roles
  private counterRole?: CounterRoleAdapter;
  
  async getRoles(): Promise<Map<string, any>> {
    const roles = new Map<string, any>();
    roles.set('Counter#0', this.counterRole);
    return roles;
  }

  async init(): Promise<void> {
    // TODO: implement init
    this.counterRole = new CounterRoleAdapter();
    }

  async cleanup(): Promise<void> {
    // TODO: implement cleanup
  }
}

export function newCounterModel(): CounterModel {
  return new CounterModelAdapter();
}

export function getTestOptions(): Record<string, any> {
  return {
    'max-seq-runs': 1000,
    'max-parallel-runs': 1000,
    'max-actions': 10,
  };
}