import { useEffect, useState } from 'react';
import {
  buildEmptyScenarioOverrides,
  type TaxBucket,
  type TaxPersonKey,
  type TaxPlanScenarioInput,
  type TaxScenarioOverrides,
} from '@shared/taxPlanning';
import type { TaxPlanBundle } from '@shared/taxPlanning';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fieldLabelFromBucket } from '../constants';
import { NumberField } from './NumberField';

interface ManualScenarioEditorProps {
  scenario: TaxPlanBundle['scenarios'][number];
  planId: number;
  onSave: (payload: TaxPlanScenarioInput) => void;
}

export function ManualScenarioEditor({ scenario, onSave }: ManualScenarioEditorProps) {
  const [local, setLocal] = useState<TaxScenarioOverrides>(
    scenario.overrides ?? buildEmptyScenarioOverrides()
  );

  useEffect(() => {
    setLocal(scenario.overrides ?? buildEmptyScenarioOverrides());
  }, [scenario.id, scenario.overrides]);

  const updatePersonBucket = (personKey: TaxPersonKey, bucket: TaxBucket, value: number) => {
    setLocal(current => ({
      ...current,
      [personKey]: { ...current[personKey], [bucket]: value },
    }));
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Manual Overrides</CardTitle>
        <CardDescription>Persist an exact contribution split for comparison.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(['personA', 'personB'] as TaxPersonKey[]).map(personKey => (
          <div key={personKey} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {(['fhsa', 'rrsp', 'spousalRrsp', 'tfsa'] as TaxBucket[]).map(bucket => (
              <NumberField
                key={`${scenario.id}-${personKey}-${bucket}`}
                id={`${scenario.id}-${personKey}-${bucket}`}
                label={`${personKey === 'personA' ? 'Partner A' : 'Partner B'} ${fieldLabelFromBucket(bucket)}`}
                value={local[personKey][bucket]}
                onChange={value => updatePersonBucket(personKey, bucket, value)}
              />
            ))}
          </div>
        ))}
        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={() => onSave({ name: scenario.name, mode: 'manual', overrides: local })}
          >
            Save Manual Scenario
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
