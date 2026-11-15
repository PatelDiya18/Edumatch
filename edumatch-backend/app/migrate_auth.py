from sqlalchemy import inspect

from .database import engine


def migrate_auth_schema() -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    with engine.begin() as connection:
        if "student_profiles" in tables:
            profile_columns = {
                column["name"]
                for column in inspector.get_columns("student_profiles")
            }
            if "user_id" not in profile_columns:
                connection.exec_driver_sql(
                    "ALTER TABLE student_profiles "
                    "ADD COLUMN user_id INTEGER REFERENCES users(id)"
                )

        if "diagnostic_results" in tables:
            result_columns = {
                column["name"]
                for column in inspector.get_columns("diagnostic_results")
            }
            if "user_id" not in result_columns:
                connection.exec_driver_sql(
                    "ALTER TABLE diagnostic_results "
                    "ADD COLUMN user_id INTEGER REFERENCES users(id)"
                )
            if "answer_review" not in result_columns:
                connection.exec_driver_sql(
                    "ALTER TABLE diagnostic_results "
                    "ADD COLUMN answer_review TEXT"
                )
            if "student_profiles" in tables:
                connection.exec_driver_sql(
                    """
                    UPDATE diagnostic_results
                    SET user_id = (
                        SELECT student_profiles.user_id
                        FROM student_profiles
                        WHERE student_profiles.id = diagnostic_results.profile_id
                    )
                    WHERE user_id IS NULL
                    """
                )
