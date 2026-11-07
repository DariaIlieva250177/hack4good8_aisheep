/*
 * Triggers for the mock risks, generated from data/processed/triggers.csv
 * (ACAPS Risk Radar). Source links and tracking fields are dropped.
 */
import type { Trigger } from './types';

export const TRIGGERS: Record<string, Trigger[]> = {
  R1043: [
    {
      id: 'T0618',
      title: 'Expansion of cross-border attacks and insecurity',
      description:
        'Additional drone strikes, shelling, or armed incursions near the Chad–Sudan border, particularly around Adré, Tina, and other eastern border localities, increase civilian casualties, trigger further displacement into Chad, and constrain humanitarian operations in already fragile border areas. Continued insecurity may also disrupt cross-border trade and movement routes relied upon by refugees and host communities',
    },
    {
      id: 'T0619',
      title: 'Attacks on strategic infrastructure in Chad',
      description:
        'Threats by Sudanese actors against Chadian airports, border facilities, military positions, or transport infrastructure may materialise into direct attacks on strategic assets in eastern Chad. Any strike against airports such as Amdjarass, military installations, or critical transport corridors would increase the risk of direct confrontation between Chad and Sudanese armed actors, disrupt humanitarian and commercial operations, and further destabilise border regions',
    },
    {
      id: 'T0620',
      title: 'Renewed proxy mobilisation and cross-border armed group activity',
      description:
        'Historical patterns of proxy warfare between Chad and Sudan may re-emerge through the mobilisation, arming, or support of rebel groups and allied militias operating along the border. Increased involvement of SAF-aligned groups, RSF-linked actors, Darfuri armed factions, or Chadian rebel networks could expand the conflict beyond isolated border incidents and increase the likelihood of retaliatory attacks on Chadian territory.',
    },
  ],
  R1066: [
    {
      id: 'T0669',
      title: 'Retaliatory violence following the killing of senior ISWAP leader Abu-Bilal al-Minuki',
      description:
        'The reported killing of senior ISWAP leader Abu-Bilal al-Minuki by US and Nigerian forces on 15 May 2026 could trigger retaliatory attacks by ISWAP, while intensifying competition with JAS/Boko Haram for territorial influence and operational relevance. Escalating attacks against military positions, civilians, and strategic infrastructure—particularly in Borno State—could increase displacement and humanitarian needs, while military pressure and cross-border armed group movements may generate spillover effects into Niger’s Diffa region, Cameroon’s Far North, and Chad’s Lac Province.',
    },
    {
      id: 'T0670',
      title: 'Expansion of military counteroffensives and emergency security measures',
      description:
        'Nigerian and regional security forces may intensify military operations, including cross-border operations and emergency security measures, in response to rising insurgent activity. Expanded military deployments, movement restrictions, and operations around Lake Chad and border areas could increase civilian displacement, disrupt livelihoods, and further constrain humanitarian access, particularly if armed groups respond with additional attacks or shift operations across borders',
    },
  ],
  R1045: [
    {
      id: 'T0625',
      title:
        "Developing El Niño conditions forecast to suppress June–September Kiremt rainfall across Ethiopia's key Meher-producing areas",
      description:
        "Climate forecasts indicate a high and rising likelihood of El Niño conditions developing by 2026, strengthening through the second half of the year. ICPAC's May 2026 forecast points to a high probability of below-normal Kiremt rainfall across Ethiopia, with precipitation deficits likely in the northeastern and central areas, where there is at least a 50% probability of deficits reaching 50% or more. This combination of reduced rainfall and above average temperatures during the critical Kiremt season is expected to suppress Meher crop yields, reduce agricultural labour demand, and accelerate pasture and water scarcity in pastoral areas.",
    },
    {
      id: 'T0626',
      title:
        'Strengthening El Niño raises risk of flooding during the October–December season in lowland and riverine areas of Ethiopia',
      description:
        'El Niño conditions are historically associated with enhanced rainfall during the October–December season across eastern East Africa. With seasonal forecast anticipating high probability of above-average precipitation between October and December 2026, there is an increased likelihood of flooding across flood-prone lowland areas of Ethiopia, especially the Somali Region. This risk may also be compounded by the positive condition of the Indian Ocean Dipole, expected to start from August-September, which typically enhances the effects of El Nino in eastern Africa.',
    },
  ],
  R1051: [
    {
      id: 'T0637',
      title: 'Extension or enforcement of goods bans',
      description:
        'Renewed decrees, checkpoint enforcement, or seizures of goods moving towards RSF-controlled areas would tighten market supply.',
    },
    {
      id: 'T0638',
      title: 'Disruption of Al Na’am/Abyei market routes',
      description:
        'Fire, insecurity, border tensions, or armed-party interference at Al Na’am would reduce alternative supply capacity.',
    },
    {
      id: 'T0639',
      title: 'Rapid price increases or market stock-outs',
      description:
        'Sustained increases in food, fuel, medicine, or seed prices would indicate worsening market access and purchasing-power collapse.',
    },
  ],
  R1054: [
    {
      id: 'T0646',
      title: 'Drone strikes directly hit Merowe Dam or grid infrastructure',
      description:
        'Attacks on turbines, substations, transmission lines, or associated power facilities would increase outage risk.',
    },
    {
      id: 'T0647',
      title: 'Longer or more frequent power outages',
      description:
        'Sustained blackouts in Khartoum, Port Sudan, Atbara, Dongola, or other dependent areas would indicate damage beyond temporary disruption.',
    },
    {
      id: 'T0648',
      title: 'Drone capability expansion through external supply',
      description:
        'New long-range munitions, cross-border supply activity, or intensified RSF drone campaigns would raise the likelihood of damaging attacks.',
    },
  ],
  R1055: [
    {
      id: 'T0649',
      title: 'Further aid cuts in eastern Chad',
      description:
        'Reduced food, health, shelter, or cash assistance would increase pressure on refugees to return despite insecurity.',
    },
    {
      id: 'T0650',
      title: 'Expansion of refugee relocation from border areas',
      description:
        'Broader relocation away from the Sudan border or fear linked to military deployment could prompt premature return decisions.',
    },
    {
      id: 'T0651',
      title: 'Increase in returns through West Darfur entry points',
      description:
        'Rising IOM-recorded return movements or reports of households returning to contested areas would indicate materialisation.',
    },
  ],
};
