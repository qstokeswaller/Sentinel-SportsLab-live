-- ============================================================
-- Migration: Public RPC functions for shared workout views
-- ============================================================
-- Two SECURITY DEFINER RPCs that let anonymous visitors view
-- workout programs and templates via shareable public links.
-- Pattern follows get_wellness_form_data from 20260307.
-- ============================================================

-- 1. RPC: get_shared_workout_program
-- Returns full program (metadata + days + exercises) as JSON.
-- Joins exercises table to resolve exercise names from IDs.
CREATE OR REPLACE FUNCTION public.get_shared_workout_program(p_program_id UUID)
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT json_build_object(
        'program', (
            SELECT row_to_json(p)
            FROM (
                SELECT
                    wp.id,
                    wp.name,
                    wp.overview,
                    wp.tags,
                    wp.created_at,
                    COALESCE(
                        (SELECT json_agg(day_row ORDER BY day_row.day_number)
                         FROM (
                            SELECT
                                wd.id,
                                wd.day_number,
                                wd.name,
                                wd.instructions,
                                COALESCE(
                                    (SELECT json_agg(ex_row ORDER BY ex_row.order_index)
                                     FROM (
                                        SELECT
                                            wde.id,
                                            COALESCE(e.name, wde.exercise_id) AS exercise_name,
                                            wde.section,
                                            wde.order_index,
                                            wde.sets,
                                            wde.reps,
                                            wde.rest_min,
                                            wde.rest_sec,
                                            wde.rir,
                                            wde.rpe,
                                            wde.intensity,
                                            wde.tempo,
                                            wde.notes
                                        FROM workout_day_exercises wde
                                        LEFT JOIN exercises e ON e.id::text = wde.exercise_id
                                        WHERE wde.day_id = wd.id
                                     ) ex_row
                                    ), '[]'::json
                                ) AS exercises
                            FROM workout_days wd
                            WHERE wd.program_id = wp.id
                         ) day_row
                        ), '[]'::json
                    ) AS days
                FROM workout_programs wp
                WHERE wp.id = p_program_id
            ) p
        )
    );
$$;

-- 2. RPC: get_shared_workout_template
-- Returns a single workout template (sections JSONB already contains exercise names).
CREATE OR REPLACE FUNCTION public.get_shared_workout_template(p_template_id UUID)
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT row_to_json(t)
    FROM (
        SELECT id, name, training_phase, load, sections, created_at
        FROM workout_templates
        WHERE id = p_template_id
    ) t;
$$;
