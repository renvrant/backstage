/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ENTITY_DEFAULT_NAMESPACE, Entity } from '@backstage/catalog-model';
import { buildEntitySearch, visitEntityPart } from './search';
import type { DbEntitiesSearchRow } from './types';

describe('search', () => {
  describe('visitEntityPart', () => {
    it('expands lists of strings to several rows', () => {
      const input = { a: ['b', 'c', 'd'] };
      const output: DbEntitiesSearchRow[] = [];
      visitEntityPart('eid', '', input, output);
      expect(output).toEqual([
        { entity_id: 'eid', key: 'a', value: 'b' },
        { entity_id: 'eid', key: 'a', value: 'c' },
        { entity_id: 'eid', key: 'a', value: 'd' },
      ]);
    });

    it('expands objects', () => {
      const input = { a: { b: { c: 'd' }, e: 'f' } };
      const output: DbEntitiesSearchRow[] = [];
      visitEntityPart('eid', '', input, output);
      expect(output).toEqual([
        { entity_id: 'eid', key: 'a.b.c', value: 'd' },
        { entity_id: 'eid', key: 'a.e', value: 'f' },
      ]);
    });

    it('converts base types to strings or null', () => {
      const input = {
        a: true,
        b: false,
        c: 7,
        d: 'string',
        e: null,
        f: undefined,
      };
      const output: DbEntitiesSearchRow[] = [];
      visitEntityPart('eid', '', input, output);
      expect(output).toEqual([
        { entity_id: 'eid', key: 'a', value: 'true' },
        { entity_id: 'eid', key: 'b', value: 'false' },
        { entity_id: 'eid', key: 'c', value: '7' },
        { entity_id: 'eid', key: 'd', value: 'string' },
        { entity_id: 'eid', key: 'e', value: null },
        { entity_id: 'eid', key: 'f', value: null },
      ]);
    });

    it('skips over special keys', () => {
      const input = {
        a: 'a',
        metadata: {
          b: 'b',
          name: 'name',
          namespace: 'namespace',
          uid: 'uid',
          etag: 'etag',
          generation: 'generation',
          c: 'c',
        },
        d: 'd',
      };
      const output: DbEntitiesSearchRow[] = [];
      visitEntityPart('eid', '', input, output);
      expect(output).toEqual([
        { entity_id: 'eid', key: 'a', value: 'a' },
        { entity_id: 'eid', key: 'metadata.b', value: 'b' },
        { entity_id: 'eid', key: 'metadata.c', value: 'c' },
        { entity_id: 'eid', key: 'd', value: 'd' },
      ]);
    });

    it('expands list of objects', () => {
      const input = { root: { list: [{ a: 1 }, { a: 2 }] } };
      const output: DbEntitiesSearchRow[] = [];
      visitEntityPart('eid', '', input, output);
      expect(output).toEqual([
        { entity_id: 'eid', key: 'root.list.a', value: '1' },
        { entity_id: 'eid', key: 'root.list.a', value: '2' },
      ]);
    });

    it('emits lowercase version of keys and values', () => {
      const input = { theRoot: { listItems: [{ a: 'One' }, { a: 2 }] } };
      const output: DbEntitiesSearchRow[] = [];
      visitEntityPart('eid', '', input, output);
      expect(output).toEqual([
        { entity_id: 'eid', key: 'theroot.listitems.a', value: 'one' },
        { entity_id: 'eid', key: 'theroot.listitems.a', value: '2' },
      ]);
    });
  });

  describe('buildEntitySearch', () => {
    it('adds special keys even if missing', () => {
      const input: Entity = {
        apiVersion: 'a',
        kind: 'b',
        metadata: { name: 'n' },
      };
      expect(buildEntitySearch('eid', input)).toEqual([
        { entity_id: 'eid', key: 'metadata.name', value: 'n' },
        { entity_id: 'eid', key: 'metadata.namespace', value: null },
        { entity_id: 'eid', key: 'metadata.uid', value: null },
        {
          entity_id: 'eid',
          key: 'metadata.namespace',
          value: ENTITY_DEFAULT_NAMESPACE,
        },
        { entity_id: 'eid', key: 'apiversion', value: 'a' },
        { entity_id: 'eid', key: 'kind', value: 'b' },
      ]);
    });
  });
});
