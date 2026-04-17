-- Seed data for courses
INSERT INTO public.courses (title, description, lessons_count, duration, rating, enrolled_count, icon, color_start, color_end) VALUES
('Maize Farming Fundamentals', 'Learn the basics of growing healthy maize crops from seed to harvest', 12, '2h 30m', 4.8, 1234, 'leaf-outline', '#22c55e', '#16a34a'),
('Pest & Disease Management', 'Identify and control common pests and diseases in your crops', 8, '1h 45m', 4.9, 987, 'bug-outline', '#ef4444', '#f97316'),
('Smart Irrigation Techniques', 'Water-efficient methods for maximum crop yield', 6, '1h 15m', 4.7, 756, 'water-outline', '#3b82f6', '#06b6d4'),
('Market Your Produce', 'Strategies to get the best prices for your harvest', 5, '1h', 4.6, 543, 'trending-up-outline', '#a855f7', '#ec4899');

-- Seed data for lessons (course 1: Maize Farming)
INSERT INTO public.lessons (course_id, title, description, duration, order_index) VALUES
((SELECT course_id FROM public.courses WHERE title = 'Maize Farming Fundamentals' LIMIT 1), 'Introduction to Maize', 'Overview of maize farming basics', '10 min', 1),
((SELECT course_id FROM public.courses WHERE title = 'Maize Farming Fundamentals' LIMIT 1), 'Soil Preparation', 'How to prepare soil for maize planting', '15 min', 2),
((SELECT course_id FROM public.courses WHERE title = 'Maize Farming Fundamentals' LIMIT 1), 'Seed Selection', 'Choosing the right maize seeds', '12 min', 3),
((SELECT course_id FROM public.courses WHERE title = 'Maize Farming Fundamentals' LIMIT 1), 'Planting Techniques', 'Proper spacing and depth for planting', '15 min', 4),
((SELECT course_id FROM public.courses WHERE title = 'Maize Farming Fundamentals' LIMIT 1), 'Water Management', 'Irrigation schedules for maize', '12 min', 5),
((SELECT course_id FROM public.courses WHERE title = 'Maize Farming Fundamentals' LIMIT 1), 'Fertilization', 'Nutrient requirements for maize', '15 min', 6),
((SELECT course_id FROM public.courses WHERE title = 'Maize Farming Fundamentals' LIMIT 1), 'Weed Control', 'Managing weeds in maize fields', '10 min', 7),
((SELECT course_id FROM public.courses WHERE title = 'Maize Farming Fundamentals' LIMIT 1), 'Pest Identification', 'Common pests affecting maize', '12 min', 8),
((SELECT course_id FROM public.courses WHERE title = 'Maize Farming Fundamentals' LIMIT 1), 'Disease Management', 'Preventing and treating maize diseases', '15 min', 9),
((SELECT course_id FROM public.courses WHERE title = 'Maize Farming Fundamentals' LIMIT 1), 'Harvesting', 'When and how to harvest maize', '10 min', 10),
((SELECT course_id FROM public.courses WHERE title = 'Maize Farming Fundamentals' LIMIT 1), 'Post-Harvest Storage', 'Proper storage techniques', '8 min', 11),
((SELECT course_id FROM public.courses WHERE title = 'Maize Farming Fundamentals' LIMIT 1), 'Profit Maximization', 'Tips for maximizing profits', '10 min', 12);

-- Seed data for quick tips
INSERT INTO public.quick_tips (title, duration, views_count) VALUES
('When to plant maize', '3 min', 12000),
('DIY organic pesticide', '5 min', 8500),
('Soil pH testing', '4 min', 6200),
('Composting basics', '6 min', 5800),
('Rainwater harvesting', '4 min', 4500);